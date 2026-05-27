export type DisasterKind = "fire" | "flood";

export function disasterForStage(stageIndex: number): DisasterKind {
  return stageIndex <= 1 ? "fire" : "flood";
}

export function disasterLabel(kind: DisasterKind): string {
  return kind === "fire" ? "화재" : "홍수";
}
