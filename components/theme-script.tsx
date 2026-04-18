export default function ThemeScript() {
  const script = `
    (function () {
      try {
        var stored = localStorage.getItem('kp-theme');
        var theme = stored || 'light';
        var root = document.documentElement;
        if (theme === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
