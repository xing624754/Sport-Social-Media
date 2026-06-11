import { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";

import { sendMessage } from "../api/chat";

import sendIcon from "../assets/send.png";
import imageIcon from "../assets/image.png";
import videoIcon from "../assets/video.png";
import docIcon from "../assets/document.png";

import "../styles/SendMessage.css";

export default function SendMessage({ chatInfo, userID, chatID, messages, addAttachment, setAddAttachment, setMessages, setChats }){
    const [messageText, setMessageText] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [isRemoved, setIsRemoved] = useState(0);

    useEffect(() => {
        if(chatInfo?.chat_type === "Group"){
            setIsRemoved(chatInfo?.is_removed)
        }
    }, [chatInfo]);

    const imageRef = useRef(null);
    const videoRef = useRef(null);
    const docRef = useRef(null);
    
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
        }
    };

    const handleAddAttachment = () => {
        if(selectedFile){
            toast.error("You can only attach one file");
            return;
        }

        setAddAttachment(!addAttachment);
    };

    const openFilePicker = (ref) => {
        if (ref?.current) {
            ref.current.click();
        }
    };

    const handleFileSelect = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (type === "image" && !file.type.startsWith("image/")) {
            toast.error("Please select an image");
            return;
        }

        if (type === "video" && !file.type.startsWith("video/")) {
            toast.error("Please select a video");
            return;
        }

        setAddAttachment(false);
        setSelectedFile(file);
    };

    const [previewURL, setPreviewURL] = useState(null);

    useEffect(() => {
        if (!selectedFile) return;

        const url = URL.createObjectURL(selectedFile);
        setPreviewURL(url);

        return () => URL.revokeObjectURL(url);
    }, [selectedFile]);


    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();

        if((messageText && messageText.trim() !== "") || selectedFile){
            const formData = new FormData();

            formData.append("userID", userID);
            formData.append("chatID", chatID);
            formData.append("chatType", chatInfo?.chat_type);
            
            if(messageText){
                formData.append("message", messageText);
            }

            if(selectedFile){
                formData.append("file", selectedFile);
            }
            
            try{
                const response = await sendMessage(formData);
                const data = response.data;

                if(response.status !== 200){
                    toast.error(data.error);
                    return;
                }

                setChats(data.user_chats);
                setMessageText("");
                setSelectedFile(null);
                setAddAttachment(false);
            }
            catch(err) {
                toast.error("Network error");
            }
        }
    };


    return(
        <div className="send-message-container">
            {selectedFile && (
                <div className="preview-box">
                    <div>
                        <button
                            className="remove-file-button"
                            type="button"
                            onClick={() => setSelectedFile(null)}
                        >
                            ✕
                        </button>
                    </div>

                    {selectedFile?.type?.startsWith("image/") && (
                        <img
                            className="attached-image"
                            src={previewURL}
                            alt="preview"
                            width="200"
                        />
                    )}

                    {selectedFile?.type?.startsWith("video/") && (
                        <video
                            className="attached-video"
                            src={previewURL}
                            controls
                            width="250"
                        />
                    )}

                    {!selectedFile?.type?.startsWith("image/") && !selectedFile?.type?.startsWith("video/") && (
                        <div className="attached-document">
                            📄 {selectedFile.name}
                        </div>
                    )}
                </div>
            )}

            {addAttachment && (
                <div className="attachment-types">
                    <div className="attachment-type-wrapper">
                        <input 
                            type="file"
                            ref={imageRef}
                            style={{ display: "none" }}
                            accept=".png,.jpg,.jpeg,.gif,.webp,image/png,image/jpeg,image/gif,image/webp"
                            onChange={(e) => {
                                handleFileSelect(e, "image")
                            }}
                        />

                        <button
                            className="attachment-type-button"
                            type="button"
                            onClick={() => openFilePicker(imageRef)}
                        >
                            <img 
                                className="attachment-type-icon"
                                src={imageIcon} 
                                alt="image" 
                            />
                        </button>

                        <label>Image</label>
                    </div>

                    <div className="attachment-type-wrapper">
                        <input 
                            type="file"
                            ref={videoRef}
                            style={{ display: "none" }}
                            accept=".mp4,.webm,.mov,.mkv,video/mp4,video/webm,video/quicktime"
                            onChange={(e) => {
                                handleFileSelect(e, "video")
                            }}
                        />

                        <button
                            className="attachment-type-button"
                            type="button"
                            onClick={() => openFilePicker(videoRef)}
                        >
                            <img 
                                className="attachment-type-icon"
                                src={videoIcon}
                                alt="video" 
                            />
                        </button>

                        <label>Video</label>
                    </div>

                    <div className="attachment-type-wrapper">
                        <input 
                            type="file"
                            ref={docRef}
                            style={{ display: "none" }}
                            accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(e) => {
                                handleFileSelect(e, "document")
                            }}
                        />

                        <button
                            className="attachment-type-button"
                            type="button"
                            onClick={() => openFilePicker(docRef)}
                        >
                            <img 
                                className="attachment-type-icon"
                                src={docIcon}
                                alt="document" 
                            />
                        </button>

                        <label>Document</label>
                    </div>
                </div>
            )}

            <div className="send-message-box-wrapper">
                {((chatInfo?.chat_type === "Group" && isRemoved === 0) || chatInfo?.chat_type === "Private") && (
                    <form onSubmit={handleSendMessage}>
                        <input
                            className="send-message-box"
                            type="text"
                            placeholder="Send a message"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />

                        <div className="message-buttons">
                            <button
                                className="add-attachment-button"
                                type="button"
                                onClick={handleAddAttachment}
                            >
                                +
                            </button>

                            <button
                                className="send-message-button"
                                type="submit"
                            >
                                <img 
                                    className="send-message-icon"
                                    src={sendIcon} 
                                    alt="send message" 
                                />
                            </button>
                        </div>
                    </form>
                )}

                {(chatInfo?.chat_type === "Group" && isRemoved === 1) && (
                    <label className="info-label">You have been removed from this group.</label>
                )}
        
            </div>
        </div>
    );
};