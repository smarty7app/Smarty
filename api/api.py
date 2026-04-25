from flask import Flask, request, jsonify
from dotenv import load_dotenv
load_dotenv()
from flask_cors import CORS
import requests
import json
import edge_tts
import base64
import asyncio
import io
import time
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson.objectid import ObjectId

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"]
    }
})

# --- اتصال قاعدة البيانات ---
MONGO_URI = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/')
mongo_client = MongoClient(MONGO_URI)
db = mongo_client['smartyDB']
reminders_collection = db['reminders']
users_collection = db['users']
# ✅ مجموعة جديدة لتخزين المحادثات
conversations_collection = db['conversations']

# --- استخدام Google Gemini API ---
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise Exception("GEMINI_API_KEY is not set in environment variables")

GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"

# --- إعدادات Edge-TTS ---
VOICE = "ar-SA-HamedNeural"

async def text_to_audio(text):
    try:
        audio_fp = io.BytesIO()
        communicate = edge_tts.Communicate(text, VOICE)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_fp.write(chunk["data"])
        audio_fp.seek(0)
        return audio_fp
    except Exception as e:
        print(f"⚠️ TTS error: {e}")
        return None

# --- دوال التذكيرات ---
def extract_reminder_info(prompt, reply):
    reminder_keywords = [
        'ذكرني', 'تذكير', 'تذكر', 'نبهني', 'سجل لي', 'سجل تذكير',
        'حط تذكير', 'اضف تذكير', 'أضف تذكير', 'ذكرني ب', 'نبهني على',
        'remind', 'reminder', 'تذكرة', 'تذكير', 'ذكر', 'تذكرني'
    ]
    prompt_lower = prompt.lower()
    is_reminder = any(keyword in prompt_lower for keyword in reminder_keywords)
    if is_reminder:
        now = datetime.now()
        reminder_time = now + timedelta(hours=1)
        if 'غدا' in prompt_lower or 'tomorrow' in prompt_lower:
            reminder_time = now + timedelta(days=1)
        elif 'بعد غد' in prompt_lower or 'day after' in prompt_lower:
            reminder_time = now + timedelta(days=2)
        elif 'اليوم' in prompt_lower or 'today' in prompt_lower:
            reminder_time = now + timedelta(hours=1)
        return {
            'title': prompt[:100],
            'description': reply,
            'reminder_time': reminder_time,
            'status': 'pending'
        }
    return None

def save_reminder(user_id, reminder_info):
    reminder = {
        'userId': user_id,
        'title': reminder_info['title'],
        'description': reminder_info['description'],
        'reminderTime': reminder_info['reminder_time'],
        'status': reminder_info['status'],
        'createdAt': datetime.utcnow()
    }
    result = reminders_collection.insert_one(reminder)
    return str(result.inserted_id)

def get_user_reminders(user_id, limit=5):
    cursor = reminders_collection.find({'userId': user_id, 'status': 'pending'}).sort('reminderTime', 1).limit(limit)
    reminders = []
    for r in cursor:
        reminders.append({
            'id': str(r['_id']),
            'title': r['title'],
            'reminderTime': r['reminderTime'].isoformat() if r['reminderTime'] else None
        })
    return reminders

def update_reminder_status(reminder_id, status):
    reminders_collection.update_one(
        {'_id': ObjectId(reminder_id)},
        {'$set': {'status': status, 'updatedAt': datetime.utcnow()}}
    )

# ✅ دالة الاتصال بـ Gemini معدلة لاستقبال قائمة محتويات (محادثة كاملة)
def ask_gemini_with_history(contents: list) -> str:
    """
    contents: قائمة من الأدوار والرسائل بالتنسيق:
    [{"role": "user", "parts": [{"text": "..."}]}, {"role": "model", "parts": [{"text": "..."}]}]
    """
    payload = {
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": 500,
            "temperature": 0.7
        }
    }
    try:
        response = requests.post(GEMINI_URL, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        reply = result['candidates'][0]['content']['parts'][0]['text'].strip()
        return reply
    except Exception as e:
        print(f"❌ Gemini error: {e}")
        return "عذراً، لم أستطع معالجة طلبك حالياً."

@app.route('/ask', methods=['POST'])
def ask():
    start_time = time.time()
    data = request.json
    prompt = data.get('prompt', '')
    user_id = data.get('userId', 'anonymous')
    user_name = data.get('userName', '')
    
    print(f"📝 مستخدم: {user_name} ({user_id})")
    
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    # --- عرض التذكيرات (كما هو) ---
    show_reminders_keywords = ['تذكيراتي', 'مواعيدي', 'أذكرني', 'عرض التذكيرات', 'ما هي تذكيراتي']
    if any(keyword in prompt.lower() for keyword in show_reminders_keywords):
        user_reminders = get_user_reminders(user_id)
        if user_reminders:
            reminders_text = "، ".join([f"{r['title']} في {r['reminderTime']}" for r in user_reminders])
            reply = f"لديك هذه التذكيرات: {reminders_text}"
        else:
            reply = "ليس لديك أي تذكيرات حالياً."
        audio_fp = asyncio.run(text_to_audio(reply))
        audio_base64 = base64.b64encode(audio_fp.read()).decode() if audio_fp else None
        return jsonify({"reply": reply, "audio": audio_base64})

    # ✅ بناء سجل المحادثة من MongoDB
    history = []
    if user_id != 'anonymous':
        try:
            # جلب آخر 10 رسائل مرتبة زمنياً (الأحدث أولاً)
            cursor = conversations_collection.find({'userId': user_id}).sort('timestamp', -1).limit(10)
            history = list(cursor)
            history.reverse()  # الأقدم فالأحدث
        except Exception as e:
            print(f"⚠️ فشل جلب المحادثة: {e}")
            history = []

    # بناء محتوى الطلب لـ Gemini
    contents = []

    # رسالة النظام (system prompt) كدور "user" في البداية
    system_prompt = (
        "أنت مساعد ذكي اسمك Smarty. "
        "أجب على أي سؤال بدقة وبجملة واحدة قصيرة جداً (بحد أقصى 10 كلمات). "
        "إذا طلب المستخدم تذكيراً، احفظ التذكير ثم قل: 'تم حفظ تذكيرك'. "
        "كن مفيداً ومباشراً. تذكر سياق المحادثة السابق."
    )
    contents.append({
        "role": "user",
        "parts": [{"text": system_prompt + "\n\nالمستخدم: " + prompt}]
    })

    # إضافة الرسائل التاريخية (مع تعديل الدور من assistant إلى model)
    for msg in history:
        role = msg['role']
        if role == 'assistant':
            role = 'model'  # Gemini يستخدم 'model' بدلاً من 'assistant'
        contents.append({
            "role": role,
            "parts": [{"text": msg['content']}]
        })

    # إذا لم نكن قد أضفنا السؤال الحالي بعد (لأننا أضفناه مع system prompt)، نتجنب التكرار.
    # في هذه الحالة، السؤال الحالي موجود بالفعل في أول عنصر، لكن إذا كان هناك تاريخ طويل نضيف السؤال الحالي منفصلاً.
    # سنكتفي بما سبق لأن أول رسالة تحتوي على prompt.
    # ولكن إذا كان هناك تاريخ، قد يكون السؤال الحالي غير موجود. نضيفه إذا كان فارغًا.
    if not history and not contents[-1]['parts'][0]['text'].endswith(prompt):
        # في حالة كان history فارغًا، نضيف السؤال الحالي كرسالة منفصلة
        pass  # تمت إضافته ضمن الأول

    # في الحقيقة، من الأفضل فصل الـ system prompt عن السؤال الحالي، خاصة مع التاريخ.
    # لذلك نعيد تشكيل المحتوى:
    contents = []
    # إضافة system prompt كرسالة مستقلة
    contents.append({
        "role": "user",
        "parts": [{"text": system_prompt}]
    })
    # إضافة التاريخ
    for msg in history:
        role = 'model' if msg['role'] == 'assistant' else 'user'
        contents.append({
            "role": role,
            "parts": [{"text": msg['content']}]
        })
    # إضافة السؤال الحالي
    contents.append({
        "role": "user",
        "parts": [{"text": prompt}]
    })

    # الحصول على الرد من Gemini
    reply = ask_gemini_with_history(contents)
    reply = reply.strip().replace('\n', ' ')

    # --- حفظ المحادثة في MongoDB ---
    if user_id != 'anonymous':
        try:
            now = datetime.utcnow()
            conversations_collection.insert_many([
                {
                    'userId': user_id,
                    'role': 'user',
                    'content': prompt,
                    'timestamp': now
                },
                {
                    'userId': user_id,
                    'role': 'assistant',
                    'content': reply,
                    'timestamp': now + timedelta(seconds=1)
                }
            ])
        except Exception as e:
            print(f"⚠️ فشل حفظ المحادثة: {e}")

    # --- معالجة التذكيرات ---
    reminder_info = extract_reminder_info(prompt, reply)
    if reminder_info:
        reminder_id = save_reminder(user_id, reminder_info)
        print(f"💾 تم حفظ تذكير للمستخدم {user_id} بمعرف {reminder_id}")

    # --- توليد الصوت (اختياري) ---
    audio_base64 = None
    try:
        audio_fp = asyncio.run(text_to_audio(reply))
        if audio_fp:
            audio_base64 = base64.b64encode(audio_fp.read()).decode()
    except Exception as e:
        print(f"⚠️ TTS failed: {e}")

    elapsed = time.time() - start_time
    print(f"✅ رد في {elapsed:.2f} ثانية: {reply[:50]}...")
    return jsonify({"reply": reply, "audio": audio_base64})

if __name__ == '__main__':
    print("--- SmarTi API with Gemini, MongoDB & Conversation Memory ---")
    app.run(host="0.0.0.0", port=5000, debug=False)
