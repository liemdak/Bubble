import { ChatWindow } from '@/components/chat/ChatWindow'

export const metadata = { title: 'Agent · Bubble' }

export default function AgentPage() {
  return <ChatWindow mode="agent" />
}
