import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json({ limit: "12mb" }));
app.use(express.static("public"));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        error: "이미지가 없습니다."
      });
    }

    const match = image.match(/^data:(image\/[^;]+);base64,(.+)$/);

    if (!match) {
      return res.status(400).json({
        error: "올바른 이미지 형식이 아닙니다."
      });
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const prompt = `
너는 학교의 분리수거를 도와주는 AI야.

사진을 먼저 자세히 분석해서 실제로 버려지는 쓰레기인지 판단해.

중요한 규칙:
1. 사람, 동물, 풍경, 건물, 자동차, 가구, 식물, 일반적인 물건 등은 쓰레기가 아니면 is_trash=false.
2. 쓰레기인지 확실하지 않으면 억지로 쓰레기로 분류하지 말고 is_trash=false.
3. 실제 쓰레기라면 물체의 이름과 재질을 최대한 구체적으로 판단해.
4. 페트병, 캔, 종이컵, 비닐봉지 등 구체적인 물체 이름을 사용해.
5. 학교에서 학생이 실제로 분리배출할 수 있도록 쉽게 설명해.
6. 사진에 여러 물체가 있다면 주요한 쓰레기를 기준으로 판단해.
7. 사진의 파일명은 판단 근거로 사용하지 마.
8. 확신도가 낮다면 warning에 이유를 적어.
9. 모든 답변은 반드시 JSON 형식으로만 출력해.

분리수거 분류:
- 종이
- 플라스틱
- 유리
- 캔/금속
- 비닐
- 일반쓰레기
- 음식물쓰레기
- 기타

다음 JSON 구조를 정확히 지켜:

{
  "is_trash": true,
  "confidence": 0,
  "object_name": "",
  "material": "",
  "category": "",
  "disposal_bin": "",
  "preparation": [],
  "reason": "",
  "warning": "",
  "not_trash_reason": ""
}

쓰레기가 아니라면:
- is_trash=false
- object_name에는 사진 속 주요 물체
- not_trash_reason에 쓰레기가 아닌 이유
- category와 disposal_bin은 빈 문자열

쓰레기라면:
- is_trash=true
- object_name에는 구체적인 물체 이름
- material에는 재질
- category에는 위 분류 중 하나
- disposal_bin에는 버릴 곳
- preparation에는 버리기 전에 해야 할 행동을 배열로 작성
- reason에는 왜 그렇게 분리배출하는지 설명
- warning에는 주의사항
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: prompt
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            is_trash: { type: "boolean" },
            confidence: { type: "number" },
            object_name: { type: "string" },
            material: { type: "string" },
            category: { type: "string" },
            disposal_bin: { type: "string" },
            preparation: {
              type: "array",
              items: { type: "string" }
            },
            reason: { type: "string" },
            warning: { type: "string" },
            not_trash_reason: { type: "string" }
          },
          required: [
            "is_trash",
            "confidence",
            "object_name",
            "material",
            "category",
            "disposal_bin",
            "preparation",
            "reason",
            "warning",
            "not_trash_reason"
          ]
        }
      }
    });

    const result = JSON.parse(response.text);

    res.json(result);

  } catch (error) {
    console.error("Gemini API 오류:", error);

    res.status(500).json({
      error: "AI 분석 중 오류가 발생했습니다."
    });
  }
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: ${PORT}`);
});
