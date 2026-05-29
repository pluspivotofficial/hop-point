// YouTube の各種URL形式から動画IDを抽出し、埋め込みURL・サムネを生成するヘルパー。
// 対応形式:
//   https://www.youtube.com/watch?v=VIDEOID
//   https://youtu.be/VIDEOID
//   https://www.youtube.com/embed/VIDEOID
//   https://www.youtube.com/shorts/VIDEOID
//   https://www.youtube.com/live/VIDEOID
// ※「限定公開(unlisted)」は埋め込み可。「非公開(private)」は埋め込み不可。

export function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // 既にIDだけが渡された場合（11文字の英数記号）
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

// プライバシー強化モード(youtube-nocookie)で埋め込みURLを生成
export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export function getYouTubeThumbnail(url: string | null | undefined): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
