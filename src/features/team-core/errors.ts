type DatabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

export function teamCoreErrorMessage(error: DatabaseErrorLike) {
  if (error.code === "23505") {
    return "このURL名はすでに使用されています。別のスラッグを指定してください。";
  }

  if (error.code === "42501") {
    return "この操作を実行する権限がありません。";
  }

  return "処理を完了できませんでした。時間をおいてもう一度お試しください。";
}
