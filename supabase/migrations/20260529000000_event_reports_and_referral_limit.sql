-- ============================================================
-- 2026-06 本格運用向け機能追加
--   1. profiles.referral_limit（招待枠の個別増枠）
--   2. admin_set_referral_limit（管理者が他ユーザーの枠を更新する関数）
--   3. event_reports（イベントレポート: テキスト＋YouTube動画）
-- ============================================================

-- 1. 招待枠カラム（デフォルト5枠）------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_limit integer NOT NULL DEFAULT 5;

-- 2. 管理者が任意ユーザーの招待枠を更新する関数 ----------------
-- profiles は「本人のみ更新可」のRLSしかないため、
-- 管理者チェック付きの SECURITY DEFINER 関数で referral_limit だけを更新する。
CREATE OR REPLACE FUNCTION public.admin_set_referral_limit(_user_id uuid, _limit integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_limit integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION '管理者権限が必要です';
  END IF;

  -- 0未満は0に丸める
  _new_limit := GREATEST(_limit, 0);

  UPDATE public.profiles
    SET referral_limit = _new_limit,
        updated_at = now()
    WHERE user_id = _user_id;

  RETURN _new_limit;
END;
$$;

-- 3. イベントレポート --------------------------------------------
CREATE TABLE public.event_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',         -- TipTap本文(HTML)
  excerpt text,                             -- 一覧表示用の概要
  region text,                              -- 開催地域（都道府県）
  event_date date,                          -- 開催日
  youtube_url text,                         -- YouTube限定公開URL（任意）
  thumbnail_url text,                       -- サムネ（column-imagesバケット流用）
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamp with time zone,
  author_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.event_reports ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは公開済みのみ閲覧可
CREATE POLICY "Anyone can read published event reports" ON public.event_reports
  FOR SELECT TO authenticated
  USING (is_published = true);

-- 管理者は全操作可（下書き含む閲覧・作成・更新・削除）
CREATE POLICY "Admins can manage event reports" ON public.event_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at 自動更新（既存の共通トリガ関数を流用）
CREATE TRIGGER update_event_reports_updated_at
  BEFORE UPDATE ON public.event_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- サムネイルは既存の public バケット column-images を流用するため
-- 新規バケット・ストレージポリシーは不要（admin upload / public read は設定済み）。
