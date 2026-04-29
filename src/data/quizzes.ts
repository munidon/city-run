export interface QuizQuestion {
  id: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  source: string;
}

export const CHAPTER_1_QUIZZES: QuizQuestion[] = [
  {
    id: "fire-1",
    question: "화재 발생 시 가장 먼저 해야 할 행동은?",
    choices: [
      "119에 신고한다",
      "\"불이야!\"라고 외쳐 주변에 알린다",
      "소화기로 진압을 시도한다",
      "짐을 챙겨 대피한다",
    ],
    answerIndex: 1,
    explanation: "초기 대응의 황금 시간은 알리기 → 신고 → 진압 또는 대피 순서.",
    source: "행정안전부 국민재난안전포털",
  },
  {
    id: "fire-2",
    question: "건물 내 화재로 연기가 가득할 때 대피 자세는?",
    choices: [
      "허리를 꼿꼿이 펴고 빠르게 달린다",
      "젖은 수건으로 입과 코를 막고 자세를 낮춰 이동한다",
      "엘리베이터로 빠르게 1층으로 이동한다",
      "창문을 활짝 열어 환기한다",
    ],
    answerIndex: 1,
    explanation: "연기는 위로 차오르므로 자세를 낮추고, 유독가스를 거르기 위해 젖은 수건을 사용한다. 화재 시 엘리베이터는 절대 이용 금지.",
    source: "소방청 화재 대피 가이드",
  },
  {
    id: "fire-3",
    question: "옷에 불이 붙었을 때 가장 올바른 행동은?",
    choices: [
      "그 자리에서 빠르게 뛰어 불을 끈다",
      "물을 찾아 화장실로 달려간다",
      "멈춰서 바닥에 엎드려 굴러 불을 끈다 (Stop, Drop, Roll)",
      "옷을 그대로 벗어 던진다",
    ],
    answerIndex: 2,
    explanation: "달리면 불이 더 커진다. 멈추고(Stop) 엎드려(Drop) 굴러(Roll) 산소를 차단해 불을 끈다.",
    source: "소방청 안전수칙",
  },
  {
    id: "fire-4",
    question: "주방에서 식용유 화재가 발생했을 때 절대 해서는 안 되는 행동은?",
    choices: [
      "물을 끼얹어 끈다",
      "젖은 행주나 뚜껑으로 덮는다",
      "K급 소화기를 사용한다",
      "가스 밸브를 잠근다",
    ],
    answerIndex: 0,
    explanation: "기름 화재에 물을 부으면 폭발적으로 번진다. 산소를 차단하는 방식(K급 소화기, 뚜껑 덮기)이 안전.",
    source: "행정안전부 가정 안전수칙",
  },
  {
    id: "fire-5",
    question: "소화기 사용 순서로 올바른 것은?",
    choices: [
      "노즐 → 안전핀 → 손잡이 → 분사",
      "안전핀 뽑기 → 노즐을 불 쪽으로 → 손잡이 누르기 → 좌우로 분사",
      "손잡이 누르기 → 안전핀 → 분사",
      "분사 → 안전핀 → 손잡이",
    ],
    answerIndex: 1,
    explanation: "안핀-노즐-손잡이-분사 순. 바람을 등지고 불의 아랫부분을 빗자루로 쓸 듯 분사한다.",
    source: "소방청 소화기 사용법",
  },
];

export function pickRandomQuiz(pool: QuizQuestion[] = CHAPTER_1_QUIZZES): QuizQuestion {
  return pool[Math.floor(Math.random() * pool.length)];
}
