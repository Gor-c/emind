
import { GoogleGenAI } from "@google/genai";
import { MindMapNode } from "../types";
import { AI_CONFIG } from "../config";

const getAIInstance = () => {
  if (!AI_CONFIG.apiKey) {
    throw new Error("API_KEY 未配置，请检查环境。");
  }
  return new GoogleGenAI({ apiKey: AI_CONFIG.apiKey });
};

/**
 * 辅助函数：清理并解析 AI 返回的 JSON 字符串
 */
const safeJsonParse = (text: string | undefined): any => {
  if (!text) throw new Error("AI 返回内容为空");
  
  // 处理可能存在的 Markdown 代码块包裹
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/g, "")
    .trim();
    
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON 解析失败，原始文本内容:", text);
    throw new Error("模型生成的 JSON 格式无效，请尝试重新生成或精简输入内容。");
  }
};

// 模式 1：图片转导图 (OCR + 结构重构)
export const extractMindMapFromImage = async (base64Image: string): Promise<MindMapNode> => {
  const ai = getAIInstance();
  const base64Data = base64Image.split(',')[1] || base64Image;

  try {
    const response = await ai.models.generateContent({
      model: AI_CONFIG.model,
      contents: [
        {
          parts: [
            { text: AI_CONFIG.prompts.imageReconstruct },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        ...AI_CONFIG.params,
        responseMimeType: "application/json",
      }
    });

    const parsed = safeJsonParse(response.text);
    if (!parsed || !parsed.name) throw new Error("解析失败：未能识别到思维导图的中心主题");
    return parsed as MindMapNode;
  } catch (error: any) {
    console.error("Image Extraction Error:", error);
    throw new Error(error.message || "图片解析失败");
  }
};

// 模式 2：文本/需求文档转导图 (语义分析 + 建模)
export const generateMindMapFromText = async (textContent: string): Promise<MindMapNode> => {
  const ai = getAIInstance();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: [
        {
          parts: [
            { text: AI_CONFIG.prompts.docToMindMap },
            { text: `以下是需求文档内容，请将其转化为思维导图 JSON：\n\n${textContent}` }
          ]
        }
      ],
      config: {
        ...AI_CONFIG.params,
        responseMimeType: "application/json",
      }
    });

    const parsed = safeJsonParse(response.text);
    if (!parsed || !parsed.name) {
      throw new Error("解析失败：AI 未能提炼出有效的思维导图架构，请尝试提供更清晰的需求描述");
    }
    return parsed as MindMapNode;
  } catch (error: any) {
    console.error("Doc Analysis Error:", error);
    throw new Error(error.message || "需求文档分析失败");
  }
};
