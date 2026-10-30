"use client";

export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid min-h-[50vh] place-content-center gap-4 py-16 text-center">
      <h1 className="page-title">Страница не загрузилась</h1>
      <p className="text-muted">Обновите страницу или вернитесь назад.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className="btn" onClick={() => reset()}>
          Обновить
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => window.history.back()}>
          Назад
        </button>
      </div>
    </div>
  );
}
