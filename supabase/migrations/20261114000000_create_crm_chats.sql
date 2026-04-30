CREATE TYPE chat_status AS ENUM ('active', 'paused', 'resolved');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system', 'agent');
CREATE TYPE bot_flow_state AS ENUM ('initial', 'awaiting_collection', 'awaiting_hybrid');

CREATE TABLE public.crm_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL UNIQUE,
    customer_name TEXT,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    status chat_status DEFAULT 'active',
    requires_attention BOOLEAN DEFAULT false,
    unread_count INTEGER DEFAULT 0,
    bot_state bot_flow_state DEFAULT 'initial',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.crm_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.crm_chats(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role message_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.crm_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on chats" ON public.crm_chats FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for anon on chats" ON public.crm_chats FOR ALL TO anon USING (true);

CREATE POLICY "Allow all operations for authenticated users on messages" ON public.crm_messages FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations for anon on messages" ON public.crm_messages FOR ALL TO anon USING (true);
