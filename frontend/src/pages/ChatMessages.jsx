import { useRef, useEffect } from "react";

import "../styles/ChatMessages.css";

export default function ChatMessages({ messages, userID, chatInfo, handleScroll }){
    const BASE_URL = "http://localhost:5000/chat";

    let lastDate = "";
    let lastSender = "";

    const processedMessages = (messages || []).map((msg, i) => {
        const prev = messages[i - 1];

        const showDate = !prev || msg.date !== prev.date;

        const showSender =
            !prev ||
            msg.date !== prev.date || // 👈 important fix
            Number(msg.user_id) !== Number(prev.user_id);

        return {
            ...msg,
            showDate,
            showSender
        };
    });

    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    
    return(
        <div 
            className="messages-container"
            onScroll={handleScroll}
        >
            {processedMessages.map((message) => {
            
                const isMe = Number(message.user_id) === Number(userID);

                return (
                    <div
                        className="message-container"
                        key={message.message_id}
                    >
                        {message.showDate && (
                            <div className="date-separator">
                                {message.date}
                            </div>
                        )}
                        
                        <div className={`message-row ${isMe ? "me" : "other"}`}>
                            <div className="profile-pic-container">
                                {(!isMe && message.showSender) && (
                                    <img 
                                        className="profile-pic"
                                        src={`${BASE_URL}${message.profile_pic}`} 
                                        alt="profile photo" 
                                    />
                                )}
                            </div>

                            <div className={`message-wrapper ${isMe ? "me" : "other"}`}>
                                {(chatInfo.chat_type === "Group" && !isMe && message.showSender) && (
                                    <div className="username">
                                        {message.username}
                                    </div>
                                )}

                                {/* Image */}
                                {(message.attachment_type && message.attachment_type === "Image") && (
                                    <img 
                                        className="attached-image"
                                        src={`${BASE_URL}${message.attachment_url}`} 
                                        alt="attachment" 
                                    />
                                )}

                                {/* Video */}
                                {(message.attachment_type && message.attachment_type === "Video") && (
                                    <video 
                                        className="attached-video"
                                        controls
                                    >
                                        <source src={`${BASE_URL}${message.attachment_url}`} />
                                    </video>
                                )}

                                {/* Document */}
                                {(message.attachment_type && message.attachment_type === "Document") && (
                                    <a 
                                        className="attached-document"
                                        href={message.attachment_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        📄 {message.file_name}
                                    </a>
                                )}

                                {(message.message != null && message.message !== "") && (
                                    <p className="message-text">{message.message}</p>
                                )}

                                <div className="message-time">
                                    {message.time}
                                </div>
                            </div>                 
                        </div>
                    </div>
                );
            })}

            <div ref={bottomRef} />
        </div>
    );
};