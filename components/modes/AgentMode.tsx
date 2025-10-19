import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, Content } from '@google/genai';
import { CubeTransparentIcon, PaperAirplaneIcon, DocumentTextIcon, TrashIcon, UploadIcon } from '../icons';
import { 
    performWebSearch, 
    generateImages, 
    editImage, 
    summarizeText,
    generatePdf,
    generateWordDoc,
    generateExcelSheet,
    generateAudioFileFromText,
    generateVideoFileFromTopic,
    extractWordContent,
    getPdfPageCount,
    extractPdfPagesContentInRange,
    describeImage,
    transcribeAudio,
    generateVideoDescription,
} from '../../services/geminiService';
import { getAiClient, isApiKeyError } from '../../services/api/core';

interface AgentMessage {
    role: 'user' | 'model' | 'tool';
    content: string;
    toolCallId?: string;
    toolName?: string;
}

interface VirtualFile {
    name: string;
    content: string;
}

interface AgentModeProps {
    onApiKeyError: (message: string) => void;
}

const AGENT_SYSTEM_PROMPT = `You are a highly advanced AI assistant with a powerful "Universal Converter" mindset. Your primary purpose is to fulfill complex user requests by creatively chaining your available tools to transform information from any format to any other format.

**Core Philosophy: The Art of the Chain**
- You do NOT have direct conversion tools (e.g., 'convert_pdf_to_video').
- You MUST break down every conversion request into a logical sequence of steps.
- **Think: "To get from A to C, I must first go from A to B, then from B to C."**
- Always announce your multi-step plan to the user before you begin.

**Conversion Logic Examples (Study these carefully):**
- **User Request:** "Convert my report \`business_plan.docx\` into an audio summary."
  - **Your Plan:**
    1. "First, I need to get the text from the Word document. I will use the \`read_word_content\` tool on \`business_plan.docx\`."
    2. "Next, I will summarize this long text into key points using the \`summarize_text\` tool."
    3. "Finally, I will take the summary and turn it into speech using \`create_audio_file\`, saving it as \`summary.wav\`."

- **User Request:** "Take the image \`landscape.jpeg\` and make a short video about it."
  - **Your Plan:**
    1. "First, I need to understand what is in the image. I will use \`get_image_description\` on \`landscape.jpeg\`."
    2. "Then, I will use that description as the topic for the \`create_video_file\` tool to generate a video named \`landscape_video.webm\`."

- **User Request:** "Listen to \`meeting_notes.wav\` and create a PDF report from it."
  - **Your Plan:**
    1. "First, I'll convert the speech in \`meeting_notes.wav\` to text using the \`transcribe_audio_file\` tool."
    2. "Then, I will create a PDF document from this transcribed text using \`create_pdf_file\`, saving it as \`report.pdf\`."

- **User Request:** "Watch \`product_demo.mp4\` and create a summary for a blog post."
  - **Your Plan:**
    1. "First, I need to understand what happens in the video. I will use \`get_video_description\` on \`product_demo.mp4\`."
    2. "Next, based on the description, I will use \`summarize_text\` to create a concise summary for the blog post."
    3. "Finally, I'll save the result using \`save_text_file\` as \`blog_post_summary.txt\`."

**Your Directives:**
1.  **Plan First:** Always formulate and announce your step-by-step plan.
2.  **Execute Sequentially:** Use your tools one by one to execute your plan.
3.  **Use the Workspace:** All files you generate or are given exist in the workspace. Use \`list_files\` to see what you have.
4.  **Final Answer:** When the entire multi-step task is complete, you MUST use \`send_final_answer\` to deliver the final result and summary of your work. This is always your last action.

**Available Tools:**
- \`web_search(query: string)\`
- \`generate_image(prompt: string)\`
- \`edit_image(source_filename: string, edit_prompt: string, output_filename: string)\`
- \`get_image_description(filename: string)\`: Analyzes an image file from the workspace and returns a text description of its content.
- \`get_video_description(filename: string)\`: Analyzes a video file from the workspace and returns a detailed text description of its content.
- \`transcribe_audio_file(filename: string)\`: Converts speech from an audio file (.wav, .mp3) in the workspace into text.
- \`save_text_file(filename: string, content: string)\`
- \`read_text_file(filename: string)\`
- \`read_word_content(filename: string)\`
- \`read_pdf_content(filename: string)\`
- \`list_files()\`
- \`delete_file(filename: string)\`
- \`combine_text_files(input_filenames: string[], output_filename: string)\`
- \`summarize_text(text_to_summarize: string, detail_level: 'brief' | 'detailed')\`
- \`create_pdf_file(filename: string, content: string)\`
- \`create_word_file(filename: string, content: string)\`
- \`create_excel_file(filename: string, data_json: string)\`
- \`create_audio_file(filename: string, text_to_speak: string)\`
- \`create_video_file(topic: string, output_filename: string)\`
- \`send_final_answer(answer: string)\``;

const webSearchTool: FunctionDeclaration = {
    name: 'web_search',
    description: 'Searches the internet for textual information about a specific query. Use it to get up-to-date information or information on any general topic.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: {
                type: Type.STRING,
                description: 'The search query. Example: "current dollar exchange rate"',
            },
        },
        required: ['query'],
    },
};

const generateImageTool: FunctionDeclaration = {
    name: 'generate_image',
    description: 'Generates a new image based on a descriptive prompt and saves it to the workspace. Use this tool whenever the user asks to find, search for, create, generate, or make an image, as it is the most reliable way to obtain an image.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            prompt: {
                type: Type.STRING,
                description: 'A detailed description of the image to generate. Example: "A photorealistic cat wearing a party hat"',
            },
        },
        required: ['prompt'],
    },
};

const editImageTool: FunctionDeclaration = {
    name: 'edit_image',
    description: 'Edits an existing image from the workspace using a descriptive prompt and saves it as a new file.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            source_filename: {
                type: Type.STRING,
                description: 'The filename of the image to edit from the workspace. Example: "cat.jpeg"',
            },
            edit_prompt: {
                type: Type.STRING,
                description: 'Instructions on how to edit the image. Example: "add a blue hat to the cat"',
            },
            output_filename: {
                type: Type.STRING,
                description: 'The filename for the newly created edited image. Example: "cat_with_hat.jpeg"',
            },
        },
        required: ['source_filename', 'edit_prompt', 'output_filename'],
    },
};

const getImageDescriptionTool: FunctionDeclaration = {
    name: 'get_image_description',
    description: 'Analyzes an image file from the workspace and returns a text description of its visual content.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            filename: { type: Type.STRING, description: 'The filename of the image to analyze.' },
        },
        required: ['filename'],
    },
};

const getVideoDescriptionTool: FunctionDeclaration = {
    name: 'get_video_description',
    description: 'Analyzes a video file from the workspace and returns a detailed text description of its content, scene by scene.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            filename: { type: Type.STRING, description: 'The filename of the video to analyze.' },
        },
        required: ['filename'],
    },
};

const transcribeAudioFileTool: FunctionDeclaration = {
    name: 'transcribe_audio_file',
    description: 'Converts speech from an audio file (e.g., .wav, .mp3) in the workspace into text.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            filename: { type: Type.STRING, description: 'The filename of the audio file to transcribe.' },
        },
        required: ['filename'],
    },
};

const saveTextFileTool: FunctionDeclaration = {
    name: 'save_text_file',
    description: 'Saves specific content to a plain text file in the workspace with a specified filename. Use it to store results or notes.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            filename: {
                type: Type.STRING,
                description: 'The name of the file to create or overwrite. Example: "summary.txt"',
            },
            content: {
                type: Type.STRING,
                description: 'The plain text content to save in the file.',
            },
        },
        required: ['filename', 'content'],
    },
};

const readTextFileTool: FunctionDeclaration = {
    name: 'read_text_file',
    description: 'Reads the content of an existing plain text file in the workspace. Use it to access previously saved information.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            filename: { type: Type.STRING, description: 'The name of the plain text file to read.' },
        },
        required: ['filename'],
    },
};

const readWordContentTool: FunctionDeclaration = {
    name: 'read_word_content',
    description: 'Reads the text content of a Word document (.docx) from the workspace. Use this to process text from Word files before using other tools like summarize or create_audio.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            filename: { type: Type.STRING, description: 'The name of the .docx file to read.' },
        },
        required: ['filename'],
    },
};

const readPdfContentTool: FunctionDeclaration = {
    name: 'read_pdf_content',
    description: 'Reads the full text content of a PDF document (.pdf) from the workspace. Use this to process text from PDFs.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            filename: { type: Type.STRING, description: 'The name of the .pdf file to read.' },
        },
        required: ['filename'],
    },
};

const listFilesTool: FunctionDeclaration = {
    name: 'list_files',
    description: 'Lists all files currently in the workspace.',
    parameters: { type: Type.OBJECT, properties: {} },
};

const deleteFileTool: FunctionDeclaration = {
    name: 'delete_file',
    description: 'Deletes a file from the workspace.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            filename: { type: Type.STRING, description: 'The name of the file to delete.' },
        },
        required: ['filename'],
    },
};

const combineTextFilesTool: FunctionDeclaration = {
    name: 'combine_text_files',
    description: 'Combines the content of multiple text files into a single new file.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            input_filenames: {
                type: Type.ARRAY,
                description: 'An array of filenames to read and combine.',
                items: { type: Type.STRING },
            },
            output_filename: {
                type: Type.STRING,
                description: 'The name of the file to save the combined content to.',
            },
        },
        required: ['input_filenames', 'output_filename'],
    },
};

const summarizeTextTool: FunctionDeclaration = {
    name: 'summarize_text',
    description: 'Summarizes a long piece of text.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            text_to_summarize: {
                type: Type.STRING,
                description: 'The text content that needs to be summarized.',
            },
            detail_level: {
                type: Type.STRING,
                description: 'The desired level of detail for the summary. Can be "brief" or "detailed".',
            },
        },
        required: ['text_to_summarize', 'detail_level'],
    },
};

const createPdfFileTool: FunctionDeclaration = {
    name: 'create_pdf_file',
    description: 'Creates a PDF file (.pdf) with the given text content and saves it to the workspace.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            filename: { type: Type.STRING, description: 'The filename for the PDF. Example: "report.pdf"' },
            content: { type: Type.STRING, description: 'The text content to put in the PDF.' },
        },
        required: ['filename', 'content'],
    },
};

const createWordFileTool: FunctionDeclaration = {
    name: 'create_word_file',
    description: 'Creates a Word document (.docx) with the given text content and saves it to the workspace.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            filename: { type: Type.STRING, description: 'The filename for the document. Example: "letter.docx"' },
            content: { type: Type.STRING, description: 'The text content of the document.' },
        },
        required: ['filename', 'content'],
    },
};

const createExcelFileTool: FunctionDeclaration = {
    name: 'create_excel_file',
    description: 'Creates an Excel spreadsheet (.xlsx) from a JSON string and saves it to the workspace.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            filename: { type: Type.STRING, description: 'The filename for the spreadsheet. Example: "data.xlsx"' },
            data_json: { type: Type.STRING, description: 'A JSON string representing an array of objects. Each object is a row, and its keys are the column headers.' },
        },
        required: ['filename', 'data_json'],
    },
};

const createAudioFileTool: FunctionDeclaration = {
    name: 'create_audio_file',
    description: 'Creates an audio file (.wav) from text using text-to-speech and saves it to the workspace.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            filename: { type: Type.STRING, description: 'The filename for the audio file. Example: "narration.wav"' },
            text_to_speak: { type: Type.STRING, description: 'The text to convert to speech.' },
        },
        required: ['filename', 'text_to_speak'],
    },
};

const createVideoFileTool: FunctionDeclaration = {
    name: 'create_video_file',
    description: 'Creates a short news-style video (.webm) about a given topic. This is a complex, multi-step process that can take several minutes. It involves searching the web, writing a script, generating images, and creating a voiceover.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            topic: { type: Type.STRING, description: 'The topic for the video. Example: "latest discoveries on Mars"' },
            output_filename: { type: Type.STRING, description: 'The filename for the video file. Example: "mars_report.webm"' },
        },
        required: ['topic', 'output_filename'],
    },
};

const sendFinalAnswerTool: FunctionDeclaration = {
    name: 'send_final_answer',
    description: 'Presents the final, complete answer to the user after all necessary steps and tool uses are finished. This should be the last action taken.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            answer: {
                type: Type.STRING,
                description: 'The final, comprehensive answer to the user\'s request, formatted in Markdown.',
            },
        },
        required: ['answer'],
    },
};

const availableTools = {
    web_search: performWebSearch,
};

export const AgentMode: React.FC<AgentModeProps> = ({ onApiKeyError }) => {
    const [messages, setMessages] = useState<AgentMessage[]>([
        { role: 'model', content: "مرحباً! أنا مساعدك الذكي متعدد المهارات. يمكنني الآن تحليل الفيديوهات، تحويل الملفات، البحث في الويب، إنشاء مستندات، والمزيد. قم برفع ملف (بما في ذلك الفيديو) أو اطلب مني مهمة للبدء." }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [files, setFiles] = useState<Record<string, string>>({});
    const [selectedFile, setSelectedFile] = useState<VirtualFile | null>(null);
    const [fileToDelete, setFileToDelete] = useState<string | null>(null);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const aiRef = useRef<GoogleGenAI | null>(null);

    useEffect(() => {
        try {
            aiRef.current = getAiClient();
        } catch (e) {
            if (isApiKeyError(e)) {
                onApiKeyError(e instanceof Error ? e.message : 'مفتاح API مطلوب.');
            }
            setError(e instanceof Error ? e.message : 'فشل في تهيئة العميل');
        }
    }, [onApiKeyError]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const handleConfirmDelete = (filename: string) => {
        setFiles(prev => {
            const newFiles = {...prev};
            delete newFiles[filename];
            return newFiles;
        });
        setFileToDelete(null);
         setMessages(prev => [...prev, { role: 'model', content: `تم حذف الملف "${filename}" بنجاح.` }]);
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            const filename = file.name;
            
            setFiles(prev => ({...prev, [filename]: dataUrl}));
            
            const userMessage = `تم رفع الملف "${filename}" إلى مساحة العمل.`;
            setMessages(prev => [...prev, { role: 'model', content: userMessage }]);
            setIsUploading(false);
        };
        reader.onerror = () => {
            setError(`فشل في قراءة الملف: ${file.name}`);
            setIsUploading(false);
        };
        reader.readAsDataURL(file);

        if (event.target) {
            event.target.value = '';
        }
    };

    const runConversation = async (currentMessages: AgentMessage[]) => {
        try {
            if (!aiRef.current) {
                aiRef.current = getAiClient();
            }
        } catch (e) {
             if (isApiKeyError(e)) {
                onApiKeyError(e instanceof Error ? e.message : 'مفتاح API مطلوب.');
            }
            setError(e instanceof Error ? e.message : 'فشل في تهيئة العميل');
            setIsLoading(false);
            return;
        }

        const formattedHistory: Content[] = currentMessages.map(msg => {
            if (msg.role === 'tool') {
                return {
                    role: 'model', 
                    parts: [{ functionResponse: { name: msg.toolName!, response: { result: msg.content } } }]
                };
            }
            return {
                role: msg.role,
                parts: [{ text: msg.content }]
            };
        }).filter(Boolean);


        try {
            const response = await aiRef.current.models.generateContent({
                model: "gemini-2.5-flash",
                contents: formattedHistory,
                config: {
                    systemInstruction: AGENT_SYSTEM_PROMPT,
                    tools: [{ functionDeclarations: [
                        webSearchTool, 
                        generateImageTool,
                        editImageTool,
                        getImageDescriptionTool,
                        getVideoDescriptionTool,
                        transcribeAudioFileTool,
                        saveTextFileTool, 
                        readTextFileTool, 
                        readWordContentTool,
                        readPdfContentTool,
                        listFilesTool, 
                        deleteFileTool,
                        combineTextFilesTool,
                        summarizeTextTool,
                        createPdfFileTool,
                        createWordFileTool,
                        createExcelFileTool,
                        createAudioFileTool,
                        createVideoFileTool,
                        sendFinalAnswerTool,
                    ] }],
                },
            });

            const functionCalls = response.functionCalls;

            if (functionCalls && functionCalls.length > 0) {
                const fc = functionCalls[0];
                const toolName = fc.name;
                const toolArgs = fc.args;
                
                if (toolName === 'send_final_answer' && 'answer' in toolArgs) {
                    const { answer } = toolArgs as { answer: string };
                    setMessages(prev => [...prev, { role: 'model', content: `**الإجابة النهائية:**\n\n${answer}` }]);
                    setIsLoading(false);
                    return; // End conversation loop
                }
                
                setMessages(prev => [...prev, { role: 'model', content: `التفكير: سأستخدم أداة \`${toolName}\` بالمعلومات التالية: \`${JSON.stringify(toolArgs)}\`` }]);

                let toolResult: string;
                if (toolName === 'web_search' && 'query' in toolArgs) {
                    toolResult = await availableTools.web_search(toolArgs.query as string);
                } else if (toolName === 'generate_image' && 'prompt' in toolArgs) {
                    const { prompt } = toolArgs as { prompt: string };
                    const imageResult = await generateImages(prompt, 1);
                    if (imageResult && imageResult.length > 0) {
                        const generatedImage = imageResult[0];
                        const safePrompt = prompt.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 50);
                        const filename = `${safePrompt}.jpeg`;
                        const fileContent = `data:image/jpeg;base64,${generatedImage.imageBytes}`;
                        setFiles(prev => ({...prev, [filename]: fileContent }));
                        toolResult = `Image generated successfully and saved to the workspace as "${filename}". Alt text: "${generatedImage.altText}"`;
                    } else {
                        toolResult = 'Failed to generate the image.';
                    }
                } else if (toolName === 'edit_image' && 'source_filename' in toolArgs && 'edit_prompt' in toolArgs && 'output_filename' in toolArgs) {
                    const { source_filename, edit_prompt, output_filename } = toolArgs as { source_filename: string; edit_prompt: string; output_filename: string };
                    const sourceFileContent = files[source_filename];
                    if (!sourceFileContent) {
                        toolResult = `Error: Source file "${source_filename}" not found in workspace.`;
                    } else if (!sourceFileContent.startsWith('data:image/')) {
                        toolResult = `Error: File "${source_filename}" is not a valid image.`;
                    } else {
                        const [header, base64Data] = sourceFileContent.split(',');
                        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                        const newImageBase64 = await editImage(base64Data, mimeType, edit_prompt);
                        const newFileContent = `data:${mimeType};base64,${newImageBase64}`;
                        setFiles(prev => ({...prev, [output_filename]: newFileContent}));
                        toolResult = `Successfully edited image and saved as "${output_filename}".`;
                    }
                } else if (toolName === 'get_image_description' && 'filename' in toolArgs) {
                    const { filename } = toolArgs as { filename: string };
                    const fileContent = files[filename];
                    if (!fileContent) {
                        toolResult = `Error: File "${filename}" not found.`;
                    } else if (!fileContent.startsWith('data:image/')) {
                        toolResult = `Error: File "${filename}" is not an image file.`;
                    } else {
                        const base64Data = fileContent.split(',')[1];
                        try {
                            toolResult = await describeImage(base64Data);
                        } catch (e) {
                            toolResult = `Error describing image: ${e instanceof Error ? e.message : String(e)}`;
                        }
                    }
                } else if (toolName === 'get_video_description' && 'filename' in toolArgs) {
                    const { filename } = toolArgs as { filename: string };
                    const fileContent = files[filename];
                    if (!fileContent) {
                        toolResult = `Error: File "${filename}" not found.`;
                    } else if (!fileContent.startsWith('data:video/')) {
                        toolResult = `Error: File "${filename}" is not a video file.`;
                    } else {
                        const [header, base64Data] = fileContent.split(',');
                        const mimeType = header.match(/:(.*?);/)?.[1] || 'video/mp4';
                        try {
                            toolResult = await generateVideoDescription(base64Data, mimeType);
                        } catch (e) {
                            toolResult = `Error describing video: ${e instanceof Error ? e.message : String(e)}`;
                        }
                    }
                } else if (toolName === 'transcribe_audio_file' && 'filename' in toolArgs) {
                    const { filename } = toolArgs as { filename: string };
                    const fileContent = files[filename];
                    if (!fileContent) {
                        toolResult = `Error: File "${filename}" not found.`;
                    } else if (!fileContent.startsWith('data:audio/')) {
                        toolResult = `Error: File "${filename}" is not an audio file.`;
                    } else {
                        const [header, base64Data] = fileContent.split(',');
                        const mimeType = header.match(/:(.*?);/)?.[1] || 'audio/wav';
                        try {
                            toolResult = await transcribeAudio(base64Data, mimeType);
                        } catch (e) {
                            toolResult = `Error transcribing audio: ${e instanceof Error ? e.message : String(e)}`;
                        }
                    }
                } else if (toolName === 'save_text_file' && 'filename' in toolArgs && 'content' in toolArgs) {
                    const { filename, content } = toolArgs as { filename: string, content: string };
                    setFiles(prev => ({...prev, [filename]: content }));
                    toolResult = `تم حفظ الملف "${filename}" بنجاح.`;
                } else if (toolName === 'read_text_file' && 'filename' in toolArgs) {
                    const { filename } = toolArgs as { filename: string };
                    toolResult = files[filename] ? `محتوى الملف ${filename}: ${files[filename]}` : `خطأ: الملف "${filename}" غير موجود.`;
                } else if (toolName === 'read_word_content' && 'filename' in toolArgs) {
                    const { filename } = toolArgs as { filename: string };
                    const fileContent = files[filename];
                    if (!fileContent) {
                        toolResult = `Error: File "${filename}" not found.`;
                    } else if (!fileContent.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
                        toolResult = `Error: File "${filename}" is not a Word document.`;
                    } else {
                        toolResult = await extractWordContent(fileContent);
                    }
                } else if (toolName === 'read_pdf_content' && 'filename' in toolArgs) {
                    const { filename } = toolArgs as { filename: string };
                    const fileContent = files[filename];
                    if (!fileContent) {
                        toolResult = `Error: File "${filename}" not found.`;
                    } else if (!fileContent.startsWith('data:application/pdf')) {
                        toolResult = `Error: File "${filename}" is not a PDF document.`;
                    } else {
                        const [header, base64Data] = fileContent.split(',');
                        const mimeType = header.match(/:(.*?);/)?.[1] || 'application/pdf';
                        const pageCount = await getPdfPageCount(base64Data, mimeType);
                        if (pageCount > 0) {
                            const pages = await extractPdfPagesContentInRange(base64Data, mimeType, 1, pageCount);
                            toolResult = pages.join('\n\n--- Page Break ---\n\n');
                        } else {
                            toolResult = "Error: Could not determine the number of pages in the PDF.";
                        }
                    }
                }
                 else if (toolName === 'list_files') {
                    const fileList = Object.keys(files);
                    toolResult = fileList.length > 0 ? `الملفات الموجودة: ${fileList.join(', ')}` : 'لا توجد ملفات في مساحة العمل.';
                } else if (toolName === 'delete_file' && 'filename' in toolArgs) {
                    const { filename } = toolArgs as { filename: string };
                    if(files[filename]) {
                        handleConfirmDelete(filename);
                        toolResult = `تم حذف الملف "${filename}"`;
                    } else {
                        toolResult = `خطأ: الملف "${filename}" غير موجود.`;
                    }
                } else if (toolName === 'combine_text_files' && 'input_filenames' in toolArgs && 'output_filename' in toolArgs) {
                    const { input_filenames, output_filename } = toolArgs as { input_filenames: string[], output_filename: string };
                    let combinedContent = '';
                    let errors = '';
                    for (const filename of input_filenames) {
                        const content = files[filename];
                        if (content) {
                            if (content.startsWith('data:')) {
                                errors += `Cannot combine non-text file: ${filename}.\n`;
                            } else {
                                combinedContent += `--- Content from ${filename} ---\n${content}\n\n`;
                            }
                        } else {
                            errors += `File not found: ${filename}.\n`;
                        }
                    }
                    if (errors) {
                        toolResult = errors;
                    } else {
                        setFiles(prev => ({...prev, [output_filename]: combinedContent}));
                        toolResult = `Successfully combined ${input_filenames.length} files into "${output_filename}".`;
                    }
                } else if (toolName === 'summarize_text' && 'text_to_summarize' in toolArgs && 'detail_level' in toolArgs) {
                    const { text_to_summarize, detail_level } = toolArgs as { text_to_summarize: string; detail_level: 'brief' | 'detailed' };
                    toolResult = await summarizeText(text_to_summarize, detail_level);
                } else if (toolName === 'create_pdf_file' && 'filename' in toolArgs && 'content' in toolArgs) {
                    const { filename, content } = toolArgs as { filename: string; content: string };
                    const pdfDataUrl = await generatePdf(content);
                    setFiles(prev => ({ ...prev, [filename]: pdfDataUrl }));
                    toolResult = `Successfully created PDF file "${filename}". Note: Arabic text may not render correctly.`;
                } else if (toolName === 'create_word_file' && 'filename' in toolArgs && 'content' in toolArgs) {
                    const { filename, content } = toolArgs as { filename: string; content: string };
                    const docxDataUrl = await generateWordDoc(content);
                    setFiles(prev => ({ ...prev, [filename]: docxDataUrl }));
                    toolResult = `Successfully created Word file "${filename}".`;
                } else if (toolName === 'create_excel_file' && 'filename' in toolArgs && 'data_json' in toolArgs) {
                    const { filename, data_json } = toolArgs as { filename: string; data_json: string };
                    const excelDataUrl = await generateExcelSheet(data_json);
                    setFiles(prev => ({ ...prev, [filename]: excelDataUrl }));
                    toolResult = `Successfully created Excel file "${filename}".`;
                } else if (toolName === 'create_audio_file' && 'filename' in toolArgs && 'text_to_speak' in toolArgs) {
                    const { filename, text_to_speak } = toolArgs as { filename: string; text_to_speak: string };
                    const audioDataUrl = await generateAudioFileFromText(text_to_speak, 'Zephyr');
                    setFiles(prev => ({ ...prev, [filename]: audioDataUrl }));
                    toolResult = `Successfully created audio file "${filename}".`;
                } else if (toolName === 'create_video_file' && 'topic' in toolArgs && 'output_filename' in toolArgs) {
                    const { topic, output_filename } = toolArgs as { topic: string; output_filename: string };
                    const videoDataUrl = await generateVideoFileFromTopic(topic);
                    setFiles(prev => ({ ...prev, [output_filename]: videoDataUrl }));
                    toolResult = `Successfully created video file "${output_filename}".`;
                }
                else {
                    toolResult = "أداة غير معروفة أو وسائط غير صالحة.";
                }

                const toolResponseMessages: AgentMessage[] = [
                    ...currentMessages,
                    { role: 'model', content: '', toolCallId: 'intermediate-call-id', toolName: toolName }, 
                    { role: 'tool', content: toolResult, toolCallId: 'intermediate-response-id', toolName: toolName }
                ];

                await runConversation(toolResponseMessages); 

            } else {
                const textResponse = response.text;
                setMessages(prev => [...prev, { role: 'model', content: textResponse }]);
                setIsLoading(false);
            }

        } catch (e) {
            if (isApiKeyError(e)) {
                onApiKeyError('فشل التحقق من مفتاح API. قد يكون غير صالح أو منتهي الصلاحية.');
            } else {
                const message = e instanceof Error ? e.message : 'حدث خطأ غير متوقع.';
                setError(message);
                setMessages(prev => [...prev, { role: 'model', content: `عذراً، حدث خطأ: ${message}` }]);
            }
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const messageText = inputMessage.trim();
        if (!messageText || isLoading) return;

        setError(null);
        setIsLoading(true);
        const newUserMessage: AgentMessage = { role: 'user', content: messageText };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setInputMessage('');

        await runConversation(updatedMessages);
    };
    
    const FileViewer: React.FC<{file: VirtualFile}> = ({ file }) => {
        const isDataUrl = file.content.startsWith('data:');
        const isImageUrl = isDataUrl && file.content.startsWith('data:image/');
        const isAudioUrl = isDataUrl && file.content.startsWith('data:audio/');
        const isVideoUrl = isDataUrl && file.content.startsWith('data:video/');

        if (isImageUrl) {
            return <img src={file.content} alt={file.name} className="max-w-full max-h-full object-contain mx-auto" />;
        }

        if (isAudioUrl) {
            return <audio controls src={file.content} className="w-full" />;
        }
        
        if (isVideoUrl) {
            return <video controls src={file.content} className="w-full max-h-full rounded bg-black" />;
        }
        
        if (isDataUrl) {
            return (
                <div className="text-center">
                    <p className="text-slate-300 mb-4">لا يمكن عرض هذا النوع من الملفات مباشرة.</p>
                    <a 
                        href={file.content} 
                        download={file.name}
                        className="inline-block px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-md transition-colors"
                    >
                        تحميل الملف
                    </a>
                </div>
            );
        }

        return <pre className="flex-grow overflow-y-auto bg-slate-900 p-4 rounded text-slate-200 whitespace-pre-wrap">{file.content}</pre>;
    };

    return (
        <div className="w-full flex-grow flex flex-col bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
                <CubeTransparentIcon className="h-6 w-6 text-cyan-400" />
                <h2 className="text-2xl font-bold text-slate-100">المساعد الذكي</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0">
                {/* Workspace Panel */}
                <div className="lg:col-span-1 flex flex-col bg-slate-900/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                        <h3 className="text-lg font-semibold text-slate-200">مساحة العمل</h3>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-md transition-colors flex items-center gap-1.5"
                            title="Upload a file to the workspace"
                        >
                            <UploadIcon className="h-4 w-4" />
                            <span>رفع ملف</span>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept=".txt,.md,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*,audio/*,video/*"
                        />
                    </div>

                    <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                        {isUploading && (
                            <div className="text-slate-400 text-sm text-center p-4">جارٍ رفع الملف...</div>
                        )}
                        {Object.keys(files).length === 0 && !isUploading ? (
                            <p className="text-slate-500 text-sm text-center pt-8">لا توجد ملفات بعد. قم برفع ملف أو اطلب من المساعد إنشاء واحد.</p>
                        ) : (
                            Object.keys(files).map((name) => (
                                <div key={name} className="flex items-center justify-between gap-2 p-2 rounded-md bg-slate-800 hover:bg-slate-700 group">
                                    <button onClick={() => setSelectedFile({ name, content: files[name] })} className="flex-grow text-right flex items-center gap-2">
                                        <DocumentTextIcon className="h-5 w-5 text-slate-400" />
                                        <span className="text-slate-200 truncate" title={name}>{name}</span>
                                    </button>
                                    <button onClick={() => setFileToDelete(name)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 flex-shrink-0" title={`حذف ${name}`}>
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Panel */}
                <div className="lg:col-span-2 flex flex-col bg-slate-900/50 rounded-lg p-4">
                    <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`max-w-[90%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : ''} ${msg.role === 'model' ? 'bg-slate-700 text-slate-200 rounded-bl-none' : ''}`}>
                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && <div className="text-center text-slate-400">المساعد يفكر...</div>}
                        <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleSendMessage} className="relative">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="اطلب مهمة..."
                            disabled={isLoading}
                            className="w-full p-3 pr-12 bg-slate-700 border border-slate-600 rounded-full text-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                        />
                        <button type="submit" disabled={isLoading || !inputMessage.trim()} className="absolute left-2 top-1/2 -translate-y-1/2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 p-2 rounded-full">
                            <PaperAirplaneIcon className="h-5 w-5 text-white"/>
                        </button>
                    </form>
                    {error && <p className="mt-2 text-center text-red-400 text-sm">{error}</p>}
                </div>
            </div>

            {selectedFile && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setSelectedFile(null)}>
                    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-cyan-400 mb-4 break-all">{selectedFile.name}</h3>
                        <div className="flex-grow overflow-auto p-2 bg-slate-900 rounded flex items-center justify-center">
                           <FileViewer file={selectedFile} />
                        </div>
                        <button onClick={() => setSelectedFile(null)} className="mt-4 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-md transition-colors self-end">
                            إغلاق
                        </button>
                    </div>
                </div>
            )}
            
            {fileToDelete && (
                 <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
                        <h3 className="text-lg font-bold text-slate-100">تأكيد الحذف</h3>
                        <p className="text-slate-300 my-3">هل أنت متأكد أنك تريد حذف الملف "<span className="font-semibold text-red-400">{fileToDelete}</span>"؟ لا يمكن التراجع عن هذا الإجراء.</p>
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setFileToDelete(null)} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-md transition-colors">إلغاء</button>
                            <button onClick={() => handleConfirmDelete(fileToDelete)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-md transition-colors">حذف</button>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};