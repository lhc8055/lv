-- ============================================================
-- 星柚打手系统 · 后端账号验证脚本
-- 请在 Supabase 控制台 → SQL Editor 中执行以下全部内容
-- ============================================================

-- 1. 启用 pgcrypto（用于 bcrypt 密码哈希）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. 打手账号表
CREATE TABLE IF NOT EXISTS dashou_accounts (
  username      TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  invite_code   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 内置演示账号（密码 asd20090505，bcrypt 哈希）
INSERT INTO dashou_accounts (username, password_hash, invite_code)
VALUES ('xingyou', crypt('asd20090505', gen_salt('bf')), 'XY2024')
ON CONFLICT (username) DO NOTHING;

-- 4. 注册函数：服务端校验用户名/密码/邀请码，bcrypt 哈希存储
CREATE OR REPLACE FUNCTION dashou_register(
  p_username    TEXT,
  p_password    TEXT,
  p_invite_code TEXT
) RETURNS JSONB AS $$
BEGIN
  -- 邀请码校验
  IF p_invite_code <> 'XY2024' THEN
    RETURN jsonb_build_object('ok', false, 'msg', '邀请码不正确');
  END IF;
  -- 用户名：中文/英文/数字，2-16位
  IF p_username !~ '^[\u4e00-\u9fa5A-Za-z0-9]{2,16}$' THEN
    RETURN jsonb_build_object('ok', false, 'msg', '用户名需为中文、英文或数字，2-16位');
  END IF;
  -- 密码：至少6位，必须同时包含英文字母和中文字符
  IF length(p_password) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'msg', '密码至少6位');
  END IF;
  IF p_password !~ '[a-zA-Z]' THEN
    RETURN jsonb_build_object('ok', false, 'msg', '密码必须包含英文字母');
  END IF;
  IF p_password !~ '[\u4e00-\u9fa5]' THEN
    RETURN jsonb_build_object('ok', false, 'msg', '密码必须包含中文字符');
  END IF;
  -- 用户名已存在
  IF EXISTS (SELECT 1 FROM dashou_accounts WHERE username = p_username) THEN
    RETURN jsonb_build_object('ok', false, 'msg', '该用户名已被注册');
  END IF;
  -- 写入哈希密码
  INSERT INTO dashou_accounts (username, password_hash, invite_code)
  VALUES (p_username, crypt(p_password, gen_salt('bf')), p_invite_code);
  RETURN jsonb_build_object('ok', true, 'msg', '注册成功');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 登录函数：bcrypt 校验密码
CREATE OR REPLACE FUNCTION dashou_login(
  p_username TEXT,
  p_password TEXT
) RETURNS JSONB AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT password_hash INTO v_hash
  FROM dashou_accounts
  WHERE username = p_username;

  IF v_hash IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'msg', '用户名或密码错误');
  END IF;
  IF v_hash <> crypt(p_password, v_hash) THEN
    RETURN jsonb_build_object('ok', false, 'msg', '用户名或密码错误');
  END IF;
  RETURN jsonb_build_object('ok', true, 'msg', '登录成功');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 允许匿名角色调用两个函数（前端使用 anon key）
GRANT EXECUTE ON FUNCTION dashou_register(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION dashou_login(TEXT, TEXT) TO anon;

-- 7. 禁止匿名直接读账号表（只能通过函数访问）
REVOKE ALL ON dashou_accounts FROM anon;
REVOKE ALL ON dashou_accounts FROM authenticated;
