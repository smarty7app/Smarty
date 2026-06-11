import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export type NotificationType = "info" | "success" | "warning" | "error";

export async function sendNotification({
  userId,
  title,
  message,
  type = "info",
  actionUrl
}: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  actionUrl?: string;
}) {
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      title,
      message,
      type,
      actionUrl: typeof actionUrl === "string" ? actionUrl : "",
      read: false,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
  }
}
