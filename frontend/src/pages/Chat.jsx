import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import socket from "../api/socket";
import { useChat } from "../context/ChatContext";

import { getChats } from "../api/chat";
import { getChatInfo } from "../api/chat";
import { getTotalUnreadCount } from "../api/chat";
import { readMessages } from "../api/chat";
import { getMessages } from "../api/chat";

import NewChat from "./NewChat";
import ChatMoreActions from "./ChatMoreActions";
import ChatMessages from "./ChatMessages";
import SendMessage from "./SendMessage";

import chatIcon from "../assets/chat.png";
import groupIcon from "../assets/group.png";
import dotsIcon from "../assets/dots.png";
import "../styles/Chat.css";

export default function Chat({ currentUser }){
    const {
        openChat,
        setOpenChat,
        openOneChat,
        setOpenOneChat
    } = useChat();

    const BASE_URL = "http://localhost:5000/chat";

    const [chats, setChats] = useState([]);

    const [totalUnreadCount, setTotalUnreadCount] = useState(0);

    // open new chat selection (private or group)
    const [openNewChat, setOpenNewChat] = useState(false);

    // open a specific chat
    const [chatInfo, setChatInfo] = useState({});

    // more actions (add/delete member, delete group/chat, exit group)
    const [moreActions, setMoreActions] = useState(false);

    const [messages, setMessages] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const [addAttachment, setAddAttachment] = useState(false);

    const currentChatRef = useRef(null);

    const userID = currentUser?.userID;

    useEffect(() => {
        if (!socket.connected) {
            socket.connect();
        }
    }, [userID]);


    useEffect(() => {
        const handleMessage = (message) => {
            if (String(message.chat_id) !== String(currentChatRef.current)) return;

            setMessages((prev) => {
                const exists = prev.some(m => m.message_id === message.message_id);
                if (exists) return prev;
                return [...prev, message];
            });

            readMessages(userID, message.chat_id);
        };

        socket.on("receive_message", handleMessage);

        return () => {
            socket.off("receive_message", handleMessage);
        };
    }, [userID]);

    useEffect(() => {
        const handleRemovedFromChat = (data) => {
            socket.emit("leave_chat", { chatID: data.chatID });
            if(Number(openOneChat) === Number(data.chatID)){
                loadChatInfo(openOneChat);
            }
        };

        const handleAddedToChat = (data) => {
            socket.emit("join_chat", { chatID: data.chatID });

            if(Number(openOneChat) === Number(data.chatID)){
                setMessages([]);
                setHasMore(true);

                loadChatInfo(openOneChat);
                loadMessages(true, openOneChat);
            }
        };

        socket.on("removed_from_chat", handleRemovedFromChat);
        socket.on("group_deleted", handleRemovedFromChat);
        socket.on("added_to_chat", handleAddedToChat);

        return () => {
            socket.off("removed_from_chat", handleRemovedFromChat);
            socket.off("group_deleted", handleRemovedFromChat);
            socket.off("added_to_chat", handleAddedToChat);
        };
    }, [openOneChat, setOpenOneChat, setChats]);

    useEffect(() => {
        if(openChat && userID){
            loadChats();
        }
    }, [openChat, userID]);

    const latestChatsRef = useRef([]);

    useEffect(() => {
        const handleAllChats = (payload) => {
            if (String(payload.user_id) !== String(userID)) return;

            loadChats();
        };

        const handleUnreadCount = (payload) => {
            if (String(payload.user_id) !== String(userID)) return;
            
            setTotalUnreadCount(payload.count);
        };

        socket.on("update_all_chats", handleAllChats);
        socket.on("update_unread_count", handleUnreadCount);

        return () => {
            socket.off("update_all_chats", handleAllChats);
            socket.off("update_unread_count", handleUnreadCount);
        };
    }, [userID]);

    useEffect(() => {
        if (!userID) return;

        const fetchUnread = async () => {
            try {
                const response = await getTotalUnreadCount(userID);
                const data = await response.json();

                if (!response.ok) return;

                setTotalUnreadCount(data.total_unread_count);
            } catch (err) {
                toast.error("Failed to load unread count");
            }
        };

        fetchUnread();
    }, [userID]);

    const loadChats = async () => {
        try{
            const response = await getChats(userID);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }
            
            setChats(data.user_chats);
        }
        catch(err){
            toast.error("Network error");
        }
    };

    const loadChatInfo = async (chatId) => {

        try {
            const response = await getChatInfo(chatId, currentUser?.userID);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
            }

            setChatInfo(data.chat_info);
        }
        catch(err) {
            toast.error("Network error");
        }
    };

    const handleOpenOneChatChange = (value) => {
        setOpenOneChat(value);
    };

    const handleMessagesChange = (value) => {
        setMessages(value);
    };

    const handleAddAttachmentChange = (value) => {
        setAddAttachment(value);
    };

    const handleChatsChange = (value) => {
        setChats(value);
    };

    const readAllMessages = async (chatId) => {
        try{
            const response = await readMessages(userID, chatId);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                return;
            }

            if (String(currentChatRef.current) !== String(chatId)) return;

            setChats(data.user_chats);
        }
        catch(err){
            toast.error("Network error");
        }
    };

    useEffect(() => {
        if (!openOneChat || !currentUser?.userID) return;

        const chatId = openOneChat;

        const joinRoom = () => {
            socket.emit("join_chat", { chatID: chatId });
        };

        if (socket.connected) {
            joinRoom();
        } else {
            socket.once("connect", joinRoom);
        }

        currentChatRef.current = chatId;

        const initChat = async () => {
            setMessages([]);
            setHasMore(true);
            setMoreActions(false);
            setAddAttachment(false);

            await loadChatInfo(chatId);
            await loadMessages(true, chatId);
            await readAllMessages(chatId);
        };

        initChat();

        return () => {
            socket.emit("leave_chat", { chatID: chatId });
        };
    }, [openOneChat, currentUser?.userID]);

    const loadMessages = async (reset = false, chatId) => {
        setLoadingMore(true);

        try{
            let oldestMessageID = null;

            if (!reset && messages.length > 0) {
                oldestMessageID = messages[0]?.message_id;
            }

            const response = await getMessages(userID, chatId, oldestMessageID);
            const data = await response.json();

            if(!response.ok){
                toast.error(data.error);
                setLoadingMore(false);
                return;
            }

            if (String(currentChatRef.current) !== String(chatId)) return;

            if(data.messages.length < 30){
                setHasMore(false);
            }

            if (reset) {
                setMessages([...data.messages].reverse());
            } else {
                setMessages((prev) => [
                    ...data.messages.reverse(),
                    ...prev
                ]);
            }
        }
        catch(err) {
            toast.error("Network error");
        }
        finally {
            setLoadingMore(false);
        }
    };

    const handleScroll = (e) => {
        const { scrollTop } = e.target;

        if (loadingMore || !hasMore) return;

        if (scrollTop <= 20) {
            loadMessages(false, openOneChat);
        }
    };

    const openChatHandler = (chatId) => {
        currentChatRef.current = chatId;
        setOpenOneChat(chatId);
        setMoreActions(false);
    };


    return(
        <div>

            <button 
                className="open-chat-button"
                type="button"
                onClick={() => {
                    setOpenChat(!openChat);
                }}
            >
                <img src={chatIcon} alt="chat button" />
            </button>

            {totalUnreadCount > 0 && (
                <span className="all-total-unread">
                    {totalUnreadCount}
                </span>
            )}

            
            <div className={`chat-page ${openChat ? "open" : "closed"}`}>
                <div className="chat-left">
                    <div className="chats-header-wrapper">
                        <div className="chats-header">
                            <h3>Chats</h3>
                            
                            <button
                                className="new-chat-button"
                                type="button"
                                onClick={() => {
                                    setOpenNewChat(!openNewChat)
                                }}
                            >
                                +
                            </button>
                        </div>

                        {openNewChat && (
                            <div className="dropdown-wrapper">
                                <NewChat 
                                    userID={userID}
                                    setOpenOneChat={handleOpenOneChatChange} 
                                    setChats={handleChatsChange}
                                />
                            </div>
                        )}
                        
                    </div>

                    <div className="all-chats">
                        {chats.map((chat) => (
                            (chat.chat_type === "Group" || (chat.chat_type === "Private" && chat.is_removed === 0)) && (
                                <div
                                    className={`chat-wrapper ${openOneChat === chat.chat_id ? "selected" : ""}`}
                                    key={chat.chat_id}
                                    onClick={() => openChatHandler(chat.chat_id)}
                                >   
                                    {chat.chat_type === "Private" && (
                                        <img src={`${BASE_URL}${chat.chat_icon}`} alt="chat icon" />
                                    )}

                                    {chat.chat_type === "Group" && (
                                        <img src={groupIcon} alt="chat icon" />
                                    )}

                                    <div className="name-message-wrapper">
                                        <label>{chat.chat_name}</label>

                                        {(chat.chat_type === "Group" && chat.is_removed === 1) && (
                                            <p className="default-latest-msg">
                                                You have been removed from this group.
                                            </p>
                                        )}

                                        
                                        {(((chat.chat_type === "Group" && chat.is_removed === 0) || chat.chat_type === "Private") &&
                                            chat.latest_msg_text) && (
                                                <p>
                                                    {chat.latest_msg_user_id === userID ? "You" : chat.latest_msg_username} : {chat.latest_msg_text}
                                                </p>
                                            )
                                        }

                                        {(((chat.chat_type === "Group" && chat.is_removed === 0) || chat.chat_type === "Private") &&
                                            (chat.latest_msg_text === "" || chat.latest_msg_text == null)) && (
                                                <p className="default-latest-msg">
                                                    Start your chat now!
                                                </p>
                                            )
                                        }
                                    </div>
                                    
                                    {chat.total_unread_count > 0 && (
                                        <span className="chat-total-unread">{chat.total_unread_count}</span>
                                    )}
                                    
                                </div>
                            )
                        ))}
                    </div>
                </div>

                <div className="chat-right">
                    {openOneChat && chatInfo?.chat_name && (
                        <>
                        
                            <div className="chat-header">
                                {chatInfo?.chat_type === "Private" && (
                                    <img src={`${BASE_URL}${chatInfo?.chat_icon}`} alt="chat icon" />
                                )}

                                {chatInfo?.chat_type === "Group" && (
                                    <img src={groupIcon} alt="chat icon" />
                                )}

                                <label>{chatInfo?.chat_name || "Loading..."}</label>

                                <button
                                    className="more-actions-button"
                                    type="button"
                                    onClick={() => setMoreActions(!moreActions)}
                                >
                                    <img src={dotsIcon} alt="more actions" />
                                </button>
                            </div>

                            {moreActions && (
                                <ChatMoreActions 
                                    userID={userID}
                                    chatID={openOneChat}
                                    chatInfo={chatInfo}
                                    setOpenOneChat={handleOpenOneChatChange}
                                    setChats={handleChatsChange}
                                />
                            )}
                            
                            <div
                                className="chat-container"
                            >
                                {messages.length === 0 ? (
                                    <div className="empty-chat">
                                        No messages yet. Start the conversation!
                                    </div>
                                ) : (
                                    <ChatMessages 
                                        messages={messages}
                                        userID={userID}
                                        chatInfo={chatInfo}
                                        handleScroll={handleScroll}
                                    />
                                )}

                            </div>

                            <SendMessage 
                                chatInfo={chatInfo}
                                userID={userID}
                                chatID={openOneChat}
                                messages={messages}
                                addAttachment={addAttachment}
                                setAddAttachment={handleAddAttachmentChange}
                                setMessages={handleMessagesChange}
                                setChats={handleChatsChange}
                            />
                        
                        </>
                    )}
                    
                </div>  
            </div>

        </div>
    );
};