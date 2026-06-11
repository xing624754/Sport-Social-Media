import { createContext, useContext, useState } from "react";

const ChatContext = createContext();

export function ChatProvider({ children }) {
    const [openChat, setOpenChat] = useState(false);
    const [openOneChat, setOpenOneChat] = useState(null);

    return (
        <ChatContext.Provider value={{
            openChat,
            setOpenChat,
            openOneChat,
            setOpenOneChat
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export const useChat = () => useContext(ChatContext);