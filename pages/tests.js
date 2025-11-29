// pages/tests.js — временная заглушка, чтобы сборка не падала

export default function TestsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2E003E] via-[#200026] to-black text-white flex items-center justify-center">
      <div className="max-w-md text-center px-6">
        <div className="text-3xl font-extrabold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent mb-3">
          NOOLIX — тесты
        </div>
        <p className="text-sm text-purple-100/90 mb-2">
          Страница тестов временно на доработке.
        </p>
        <p className="text-xs text-purple-200/80">
          Мы сохраняем все идеи про уровни сложности, разбор ошибок и карту
          знаний. Сейчас эта страница работает как заглушка, чтобы можно было
          спокойно доделать остальные разделы платформы.
        </p>
      </div>
    </div>
  );
}
