const addToMyReminders = async () => {
  if (!reminder) return;
  setIsAdding(true);
  try {
    // إضافة التذكير مباشرة إلى localStorage
    const existingReminders = JSON.parse(localStorage.getItem('smarty_reminders') || '[]');
    const newReminder = {
      id: Math.random().toString(36).substr(2, 9),
      text: reminder.text,
      reminderTime: reminder.reminderTime,
      isCompleted: false,
    };
    const updatedReminders = [newReminder, ...existingReminders];
    localStorage.setItem('smarty_reminders', JSON.stringify(updatedReminders));
    toast.success('تمت إضافة التذكير إلى قائمتك!');
    // إعادة التوجيه إلى الصفحة الرئيسية
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  } catch (error) {
    console.error(error);
    toast.error('حدث خطأ أثناء الإضافة');
  } finally {
    setIsAdding(false);
  }
};
