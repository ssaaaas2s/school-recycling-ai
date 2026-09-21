import express from "express";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.use(express.json({ limit: "12mb" }));
app.use(express.static("public"));

const systemPrompt = `
너는 학교의 분리수거를 돕는 쓰레기 판별 AI다.

사진을 보고 먼저 실제 쓰레기인지 판단한다.
사람, 동물, 풍경, 건물, 식물, 차량, 책상, 사용 중인 일반 물건 등
명백히 쓰레기가 아닌 것은 is_trash=false로 판단한다.

쓰레기라면 다음을 판단한다.
1. 물체의 구체적인 이름
2. 예상 재질
3. 분리수거 분류
4. 배출 장소 또는 방법
5. 배출 전에 해야 할 준비
6. 그렇게 분류하는 이유
7. 확신도 0~100

사진만으로 재질을 확정하기 어렵다면 추정이라고 표시한다.
복합재질이면 주의사항을 설명한다.
학교와 지역에 따라 기준이 다를 수 있으므로 실제 학교 기준을 우선 확인하도록 한다.

반드시 JSON만 반환한다.

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

쓰레기가 아니면 is_trash=false로 하고,
object_name에는 사진 속 대상을 적는다.
material, category, disposal_bin은 빈 문자열로 둔다.
`;

app.post("/api/analyze", async (req, res) => {
  try {
    if (!client) {
      return res.status(500).json({
        error: "OPENAI_API_KEY가 설정되지 않았습니다."
      });
    }

    const image = req.body.image;

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        error: "이미지가 전달되지 않았습니다."
      });
    }

    const response = await client.responses.create({
      model: "gpt-5.6-luna",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: systemPrompt + "\n이 사진을 분석해줘."
            },
            {
              type: "input_image",
              image_url: image,
              detail: "high"
            }
          ]
        }
      ],
      max_output_tokens: 1200
    });

    const text = response.output_text.trim();

    const cleaned = text
      .replace(/^```json\\s*/i, "")
      .replace(/\\s*```$/i, "");

    const result = JSON.parse(cleaned);

    res.json(result);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "AI 분석 중 오류가 발생했습니다.",
      detail: error.message || String(error)
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log("School Recycling AI server running on port " + port);
});
