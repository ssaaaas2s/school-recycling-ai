import express from "express";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;
const client = process.env.OPENAI_API_KEY ? new OpenAI({apiKey: process.env.OPENAI_API_KEY}) : null;

app.use(express.json({limit:"12mb"}));
app.use(express.static("public"));

const systemPrompt = `
너는 학교의 분리수거를 돕는 '쓰레기 판별 AI'다.
사진을 보고 먼저 그것이 실제로 버려지는 물건/폐기물인지 판단한다.
사람, 동물, 풍경, 건물, 식물, 차량, 책상 같은 일반 물체, 장난감처럼 사용 중인 물건 등
명백히 쓰레기가 아닌 것은 is_trash=false로 판정한다.
쓰레기인지 애매하면 억지로 쓰레기로 분류하지 말고 is_trash=false 또는 low confidence로 판단한다.

쓰레기라면:
1) 사진 속 물체의 구체적인 이름
2) 예상 재질(플라스틱, PET, 종이, 종이팩, 유리, 철/알루미늄, 비닐/필름, 음식물, 섬유, 전자제품, 복합재질, 기타)
3) 학교에서 사용할 수 있는 분리수거 분류
4) 실제 배출 전에 해야 할 준비
5) 왜 그렇게 분류하는지
6) 확신도(0~100)
를 설명한다.

중요:
- 사진만으로 재질을 확정할 수 없으면 '추정'이라고 명시한다.
- 복합재질이면 한 종류로 단정하지 않는다.
- 음식물 오염 여부가 배출 방법에 영향을 주면 반드시 설명한다.
- 지역/학교마다 기준이 다를 수 있으므로 '학교의 실제 분리배출 기준을 우선 확인'하도록 한다.
- 사진 속 사람이 보인다고 쓰레기라고 판단하지 않는다.
- 사진에 여러 물체가 있으면 주요 대상이 무엇인지 설명하고, 가능하면 각각 구분한다.
- 절대 사진 파일명을 근거로 판단하지 않는다.

반드시 아래 JSON 구조만 반환한다.
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
is_trash=false인 경우 object_name에는 보이는 대상을 쓰고, material/category/disposal_bin은 빈 문자열로 둔다.
`;

app.post("/api/analyze", async (req,res)=>{
  try {
    if(!client) return res.status(500).json({error:"OPENAI_API_KEY가 설정되지 않았습니다."});
    const {image} = req.body;
    if(!image || typeof image !== "string" || !image.startsWith("data:image/"))
      return res.status(400).json({error:"이미지 데이터가 필요합니다."});

    const response = await client.responses.create({
      model: "gpt-5.6-luna",
      input: [{
        role:"user",
        content:[
          {type:"input_text", text: systemPrompt + "\n이 사진을 분석해줘."},
          {type:"input_image", image_url:image, detail:"high"}
        ]
      ],
      max_output_tokens:1200
    });

    let text=response.output_text?.trim() || "";
    text=text.replace(/^```json\s*/i,"").replace(/```$/,"").trim();
    let data;
    try { data=JSON.parse(text); }
    catch {
      const match=text.match(/\{[\s\S]*\}/);
      if(!match) throw new Error("AI가 올바른 JSON을 반환하지 않았습니다.");
      data=JSON.parse(match[0]);
    }
    res.json(data);
  } catch(e) {
    console.error(e);
    res.status(500).json({error:"AI 분석 중 오류가 발생했습니다.", detail:e.message});
  }
});

app.listen(port,()=>console.log(`학교 분리수거 AI: http://localhost:${port}`));
