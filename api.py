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

# --- إعدادات Ollama ---
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "iKhalid/ALLaM:7b-q4_K_S"  # النموذج السعودي الأسرع

# --- إعدادات Edge-TTS ---
VOICE = "ar-SA-HamedNeural"  # شاب سعودي

async def text_to_audio(text):
    """تحويل النص إلى صوت باستخدام edge-tts"""
    audio_fp = io.BytesIO()
    communicate = edge_tts.Communicate(text, VOICE)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_fp.write(chunk["data"])
    audio_fp.seek(0)
    return audio_fp

# --- دوال مساعدة للتعامل مع التذكيرات ---
def extract_reminder_info(prompt, reply):
    """تحسين التعرف على طلبات التذكير"""
    # قائمة موسعة من الكلمات المفتاحية
    reminder_keywords = [
        'ذكرني', 'تذكير', 'تذكر', 'نبهني', 'سجل لي', 'سجل تذكير',
        'حط تذكير', 'اضف تذكير', 'أضف تذكير', 'ذكرني ب', 'نبهني على',
        'remind', 'reminder', 'تذكرة', 'تذكير', 'ذكر', 'تذكرني'
    ]
    
    # تحويل النص إلى lowercase للمقارنة (دعم الإنجليزي والعربي)
    prompt_lower = prompt.lower()
    
    is_reminder = False
    for keyword in reminder_keywords:
        if keyword in prompt_lower:
            is_reminder = True
            print(f"✅ تم التعرف على كلمة مفتاحية: {keyword}")
            break
    
    if is_reminder:
        from datetime import datetime, timedelta
        now = datetime.now()
        reminder_time = now + timedelta(hours=1)
        
        # كلمات تدل على الوقت
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
    
    print(f"⚠️ لم يتم التعرف على كلمات مفتاحية في: {prompt}")
    return None

def save_reminder(user_id, reminder_info):
    """حفظ التذكير في قاعدة البيانات"""
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
    """استخراج آخر التذكيرات للمستخدم"""
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
    """تحديث حالة التذكير"""
    reminders_collection.update_one(
        {'_id': ObjectId(reminder_id)},
        {'$set': {'status': status, 'updatedAt': datetime.utcnow()}}
    )

@app.route('/ask', methods=['POST'])
def ask():
    start_time = time.time()
    data = request.json
    prompt = data.get('prompt', '')
    user_id = data.get('userId', 'anonymous')
    user_email = data.get('userEmail', '')      # <-- أضف هذا السطر
    user_name = data.get('userName', '')        # <-- أضف هذا السطر
    
    # طباعة معلومات المستخدم (اختياري، للتأكد من وصول البيانات)
    print(f"📝 مستخدم: {user_name} ({user_email}) - المعرف: {user_id}")
    
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    # التحقق مما إذا كان المستخدم يطلب عرض تذكيراته
    show_reminders_keywords = ['تذكيراتي', 'مواعيدي', 'أذكرني', 'عرض التذكيرات', 'ما هي تذكيراتي']
    if any(keyword in prompt.lower() for keyword in show_reminders_keywords):
        user_reminders = get_user_reminders(user_id)
        if user_reminders:
            reminders_text = "، ".join([f"{r['title']} في {r['reminderTime']}" for r in user_reminders])
            reply = f"لديك هذه التذكيرات: {reminders_text}"
        else:
            reply = "ليس لديك أي تذكيرات حالياً."
        
        # توليد صوت للرد
        audio_fp = asyncio.run(text_to_audio(reply))
        audio_base64 = base64.b64encode(audio_fp.read()).decode()
        return jsonify({"reply": reply, "audio": audio_base64})

    # تعليمات للنموذج
    system_prompt = (
        "أنت مساعد ذكي اسمك Smarty. "
        "أجب على أي سؤال بدقة وبجملة واحدة قصيرة جداً (بحد أقصى 10 كلمات). "
        "إذا طلب المستخدم تذكيراً، احفظ التذكير ثم قل: 'تم حفظ تذكيرك'. "
        "كن مفيداً ومباشراً."
    )
    
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "system": system_prompt,
        "stream": False,
        "options": {
            "num_predict": 60,
            "temperature": 0.2,
            "top_p": 0.8,
            "repeat_penalty": 1.1
        }
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=45)
        response.raise_for_status()
        reply = response.json().get('response', 'عذراً، لم أفهم')
        reply = reply.strip().replace('\n', ' ')
        print(f"🔍 جاري تحليل الطلب: {prompt}")
        
        # معالجة التذكيرات
        reminder_info = extract_reminder_info(prompt, reply)
        if reminder_info:
            reminder_id = save_reminder(user_id, reminder_info)
            print(f"💾 تم حفظ تذكير للمستخدم {user_id} بمعرف {reminder_id}")
        else:
            print(f"⚠️ لم يتم التعرف على طلب تذكير: {prompt}")

        # توليد الصوت
        audio_fp = asyncio.run(text_to_audio(reply))
        audio_base64 = base64.b64encode(audio_fp.read()).decode()
        
        elapsed = time.time() - start_time
        print(f"✅ رد في {elapsed:.2f} ثانية: {reply[:50]}...")
        
        return jsonify({"reply": reply, "audio": audio_base64})
        
    except requests.exceptions.Timeout:
        print("❌ مهلة: استغرق النموذج وقتاً طويلاً")
        return jsonify({"error": "AI service timeout"}), 504
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return jsonify({"error": "AI service unavailable"}), 503

if __name__ == '__main__':
    print("--- SmarTi API مع قاعدة البيانات ---")
    print(f"النموذج المستخدم: {MODEL_NAME}")
    print(f"الصوت المستخدم: {VOICE}")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
    