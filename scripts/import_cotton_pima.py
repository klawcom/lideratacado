#!/usr/bin/env python3
"""
Script de importação e otimização para "Camisetas Básicas Cotton Pima".
- Lê subpastas de COTTON PIMA em ordem alfabética.
- Gera títulos, slugs e códigos PIMA-NN sequenciais.
- Salva o mapa em _importacao/mapa.csv.
- Otimiza imagens (máx 1600px, WebP q80) e vídeos (720p H.264 sem áudio, capa WebP) em _otimizado/products/PIMA-NN/.
- Se SUPABASE_SERVICE_ROLE_KEY estiver no .env, envia para o bucket e insere no banco (produtos, produto_midias, faixas_preco).
- Se não estiver, gera o SQL de importação em _importacao/import_catalog.sql e prepara tudo.
- Reexecutável: pula mídias já otimizadas e registros já inseridos.
"""

import os
import sys
import glob
import json
import uuid
import shutil
import unicodedata
import subprocess
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed

try:
    from PIL import Image, ImageOps
except ImportError:
    print("ERRO: Pillow não está instalado. Instale com 'pip install pillow'.", file=sys.stderr)
    sys.exit(1)

try:
    import requests
except ImportError:
    print("ERRO: requests não está instalado. Instale com 'pip install requests'.", file=sys.stderr)
    sys.exit(1)

try:
    import imageio_ffmpeg
    FFMPEG_BIN = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_BIN = shutil.which("ffmpeg")

ROOT_DIR = Path(__file__).resolve().parent.parent
COTTON_PIMA_DIR = ROOT_DIR / "COTTON PIMA"
OTIMIZADO_DIR = ROOT_DIR / "_otimizado"
IMPORTACAO_DIR = ROOT_DIR / "_importacao"
ENV_FILE = ROOT_DIR / ".env"

CATEGORIA_PIMA_ID = "11111111-1111-1111-1111-111111111111"

KNOWN_BRANDS = [
    "armani", "calvin klein", "lacoste", "ralph lauren", "tommy hilfiger",
    "diesel", "fred perry", "hugo boss", "prada", "aramis", "nike", "adidas"
]

UPPER_WORDS = {
    "ARMN", "XCHNG", "ARMS", "CLVN", "KLN", "PRD", "EMPR", "FRD", "PRRY",
    "HG", "BSS", "LCST", "PL", "RLPH", "LRN", "TMMY", "HLFGR", "DSL"
}

SPECIAL_CAPS = {
    "ÓLEO": "Óleo",
    "BÁSICA": "Básica",
    "MONOCROMÁTICO": "Monocromático",
    "TRADICIONAL": "Tradicional",
    "COLORIDO": "Colorido",
    "MODELO": "Modelo",
    "DIABO": "Diabo",
    "VESTE": "Veste",
    "CAMISETA": "Camiseta",
    "COTTON": "Cotton",
    "PIMA": "Pima",
}

def load_env():
    env = {}
    if ENV_FILE.exists():
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip(" '\"")
    return env

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8")
    text = text.lower()
    text = "".join(c if c.isalnum() else "-" for c in text)
    text = "-".join(filter(None, text.split("-")))
    return text

def format_title(folder_name: str, index: int) -> tuple[str, bool]:
    lower = folder_name.lower()
    for brand in KNOWN_BRANDS:
        if brand in lower:
            return f"Camiseta Pima Modelo {index:02d}", True

    words = folder_name.split()
    formatted = []
    for w in words:
        w_up = w.upper()
        if w_up in UPPER_WORDS:
            formatted.append(w_up)
        elif w_up in SPECIAL_CAPS:
            formatted.append(SPECIAL_CAPS[w_up])
        else:
            formatted.append(w.capitalize())
    return " ".join(formatted), False

def optimize_image_worker(args):
    src_path, dst_path = args
    if dst_path.exists() and dst_path.stat().st_size > 0:
        return dst_path, "skipped"

    try:
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(src_path) as img:
            img = ImageOps.exif_transpose(img)
            w, h = img.size
            max_dim = max(w, h)
            if max_dim > 1600:
                scale = 1600.0 / max_dim
                new_w = max(1, round(w * scale))
                new_h = max(1, round(h * scale))
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

            # Preserve mode or convert
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGB")

            img.save(dst_path, "WEBP", quality=80, method=4)
        return dst_path, "ok"
    except Exception as e:
        return dst_path, f"error: {e}"

def optimize_video_worker(args):
    src_path, dst_video, dst_cover = args
    vid_ok = dst_video.exists() and dst_video.stat().st_size > 0
    cov_ok = dst_cover.exists() and dst_cover.stat().st_size > 0
    if vid_ok and cov_ok:
        return dst_video, "skipped"

    dst_video.parent.mkdir(parents=True, exist_ok=True)

    if not FFMPEG_BIN:
        return dst_video, "error: ffmpeg not found"

    # Convert video to 720p H.264 without audio
    if not vid_ok:
        cmd = [
            FFMPEG_BIN, "-y",
            "-i", str(src_path),
            "-vf", "scale='if(gte(iw,ih),-2,720)':'if(gte(iw,ih),720,-2)'",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-crf", "23",
            "-preset", "fast",
            "-movflags", "+faststart",
            "-an",
            str(dst_video)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode != 0:
            return dst_video, f"error converting video: {res.stderr.decode('utf-8', errors='ignore')[:200]}"

        # Check target size 8MB, hard limit 50MB
        size = dst_video.stat().st_size
        if size > 8 * 1024 * 1024:
            # Re-encode with higher CRF to hit target
            cmd_re = [
                FFMPEG_BIN, "-y",
                "-i", str(src_path),
                "-vf", "scale='if(gte(iw,ih),-2,720)':'if(gte(iw,ih),720,-2)'",
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-crf", "28",
                "-preset", "fast",
                "-movflags", "+faststart",
                "-an",
                str(dst_video)
            ]
            subprocess.run(cmd_re, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # Generate video cover
    if not cov_ok:
        cmd_cover = [
            FFMPEG_BIN, "-y",
            "-ss", "00:00:01",
            "-i", str(dst_video),
            "-vframes", "1",
            "-vf", "scale='min(1600,iw)':-2",
            "-c:v", "libwebp",
            "-quality", "80",
            str(dst_cover)
        ]
        res_cov = subprocess.run(cmd_cover, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res_cov.returncode != 0 or not dst_cover.exists() or dst_cover.stat().st_size == 0:
            # Try at 00:00:00
            cmd_cover_0 = [
                FFMPEG_BIN, "-y",
                "-i", str(dst_video),
                "-vframes", "1",
                "-vf", "scale='min(1600,iw)':-2",
                "-c:v", "libwebp",
                "-quality", "80",
                str(dst_cover)
            ]
            subprocess.run(cmd_cover_0, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    return dst_video, "ok"

def upload_to_supabase(env, products_data):
    supabase_url = env.get("SUPABASE_URL") or env.get("VITE_SUPABASE_URL")
    service_role_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_KEY")

    if not supabase_url or not service_role_key:
        return False, "Credencial de serviço (SUPABASE_SERVICE_ROLE_KEY) não encontrada no .env."

    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json"
    }

    # Ensure bucket 'produtos' exists
    bucket_url = f"{supabase_url}/storage/v1/bucket/produtos"
    b_res = requests.get(bucket_url, headers=headers)
    if b_res.status_code != 200:
        create_b = requests.post(f"{supabase_url}/storage/v1/bucket", headers=headers, json={"id": "produtos", "name": "produtos", "public": True})
        print(f"Criando bucket 'produtos': {create_b.status_code}")

    # Query existing products
    ex_res = requests.get(f"{supabase_url}/rest/v1/produtos?select=id,codigo_modelo,slug", headers=headers)
    existing_prods = {}
    if ex_res.status_code == 200:
        for p in ex_res.json():
            existing_prods[p["codigo_modelo"]] = p["id"]
            existing_prods[p["slug"]] = p["id"]

    created_prods = 0
    created_midias = 0

    for prod in products_data:
        codigo = prod["codigo"]
        slug = prod["slug"]
        titulo = prod["titulo"]
        descricao = prod["descricao"]

        # Check if product exists
        prod_id = existing_prods.get(codigo) or existing_prods.get(slug)
        if not prod_id:
            # Create product
            new_id = str(uuid.uuid4())
            payload = {
                "id": new_id,
                "nome": titulo,
                "codigo_modelo": codigo,
                "slug": slug,
                "descricao": descricao,
                "composicao": "100% algodão Pima",
                "categoria_id": CATEGORIA_PIMA_ID,
                "ativo": False,
                "destaque": False,
                "ordem": prod["index"],
                "estoque": 0
            }
            ins = requests.post(f"{supabase_url}/rest/v1/produtos", headers=headers, json=payload)
            if ins.status_code in (200, 201):
                prod_id = new_id
                created_prods += 1
                existing_prods[codigo] = prod_id
                existing_prods[slug] = prod_id
            else:
                print(f"Erro ao inserir produto {codigo}: {ins.status_code} {ins.text}")
                continue

            # Insert 4 faixas de preco (10, 20, 30, 50)
            faixas = [
                {"produto_id": prod_id, "quantidade_minima": q, "preco_peca": 0.0}
                for q in (10, 20, 30, 50)
            ]
            requests.post(f"{supabase_url}/rest/v1/faixas_preco", headers=headers, json=faixas)
        else:
            print(f"Produto {codigo} já existe no banco ({prod_id}), verificando mídias...")

        # Existing midias for product
        m_res = requests.get(f"{supabase_url}/rest/v1/produto_midias?produto_id=eq.{prod_id}&select=url", headers=headers)
        existing_urls = set()
        if m_res.status_code == 200:
            existing_urls = {m["url"] for m in m_res.json()}

        # Upload files and insert produto_midias
        for m in prod["midias"]:
            url_rel = m["url"]
            if url_rel in existing_urls:
                continue

            # Upload file to storage
            file_path = m["local_path"]
            if file_path.exists():
                content_type = "image/webp" if m["tipo"] == "foto" or "capa" in file_path.name else "video/mp4"
                up_headers = {
                    "apikey": service_role_key,
                    "Authorization": f"Bearer {service_role_key}",
                    "Content-Type": content_type,
                    "x-upsert": "true"
                }
                storage_obj_url = f"{supabase_url}/storage/v1/object/produtos/{url_rel}"
                with open(file_path, "rb") as fp:
                    requests.post(storage_obj_url, headers=up_headers, data=fp)

            # If it's a video, also upload capa if exists
            capa_url_rel = m.get("capa_url")
            if capa_url_rel and "local_capa_path" in m:
                capa_file = m["local_capa_path"]
                if capa_file.exists():
                    up_headers = {
                        "apikey": service_role_key,
                        "Authorization": f"Bearer {service_role_key}",
                        "Content-Type": "image/webp",
                        "x-upsert": "true"
                    }
                    storage_obj_url = f"{supabase_url}/storage/v1/object/produtos/{capa_url_rel}"
                    with open(capa_file, "rb") as fp:
                        requests.post(storage_obj_url, headers=up_headers, data=fp)

            # Insert into produto_midias
            midia_payload = {
                "produto_id": prod_id,
                "tipo": m["tipo"],
                "url": url_rel,
                "capa_url": capa_url_rel,
                "ordem": m["ordem"],
                "principal": m["principal"]
            }
            ins_m = requests.post(f"{supabase_url}/rest/v1/produto_midias", headers=headers, json=midia_payload)
            if ins_m.status_code in (200, 201):
                created_midias += 1
                existing_urls.add(url_rel)

    return True, f"Sucesso: {created_prods} produtos e {created_midias} mídias inseridos no Supabase."

def main():
    print("=== Importador de Camisetas Básicas Cotton Pima ===")
    
    if not COTTON_PIMA_DIR.exists():
        print(f"ERRO: Diretório {COTTON_PIMA_DIR} não encontrado.", file=sys.stderr)
        sys.exit(1)

    IMPORTACAO_DIR.mkdir(parents=True, exist_ok=True)
    OTIMIZADO_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Obter subpastas em ordem alfabética
    folders = sorted([f for f in COTTON_PIMA_DIR.iterdir() if f.is_dir()])
    print(f"Encontradas {len(folders)} subpastas em COTTON PIMA.\n")

    products_data = []
    mapa_csv_rows = [["pasta", "titulo", "codigo", "slug"]]
    
    pastas_menos_10_imagens = []
    nomes_trocados = []

    image_tasks = []
    video_tasks = []

    for i, folder in enumerate(folders, 1):
        codigo = f"PIMA-{i:02d}"
        titulo, foi_trocado = format_title(folder.name, i)
        if foi_trocado:
            nomes_trocados.append((folder.name, titulo, codigo))

        slug = slugify(titulo)
        mapa_csv_rows.append([folder.name, titulo, codigo, slug])

        # Buscar arquivos de foto e vídeo
        files = sorted(folder.iterdir())
        photos = [f for f in files if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp", ".heic")]
        videos = [f for f in files if f.suffix.lower() in (".mp4", ".mov")]

        if len(photos) < 10:
            pastas_menos_10_imagens.append((folder.name, len(photos)))

        descricao = f"{titulo}. Camiseta básica cotton pima. Cores sortidas, conforme disponibilidade do estoque."

        # Mídias planejadas
        midias_planejadas = []
        
        # Otimização de fotos
        for p_idx, photo in enumerate(photos, 1):
            out_name = f"{p_idx:02d}.webp"
            dst_file = OTIMIZADO_DIR / "products" / codigo / out_name
            url_storage = f"products/{codigo}/{out_name}"
            image_tasks.append((photo, dst_file))
            midias_planejadas.append({
                "tipo": "foto",
                "url": url_storage,
                "local_path": dst_file,
                "ordem": p_idx - 1,
                "principal": (p_idx == 1)
            })

        # Otimização de vídeos
        for v_idx, video in enumerate(videos, 1):
            v_name = f"video-{v_idx:02d}.mp4"
            c_name = f"video-{v_idx:02d}-capa.webp"
            dst_video = OTIMIZADO_DIR / "products" / codigo / v_name
            dst_cover = OTIMIZADO_DIR / "products" / codigo / c_name
            url_video = f"products/{codigo}/{v_name}"
            url_cover = f"products/{codigo}/{c_name}"
            video_tasks.append((video, dst_video, dst_cover))
            midias_planejadas.append({
                "tipo": "video",
                "url": url_video,
                "local_path": dst_video,
                "capa_url": url_cover,
                "local_capa_path": dst_cover,
                "ordem": len(photos) + v_idx - 1,
                "principal": False
            })

        products_data.append({
            "index": i,
            "folder": folder.name,
            "titulo": titulo,
            "codigo": codigo,
            "slug": slug,
            "descricao": descricao,
            "qtd_fotos": len(photos),
            "qtd_videos": len(videos),
            "midias": midias_planejadas
        })

    # 2. Salvar mapa.csv
    mapa_csv_path = IMPORTACAO_DIR / "mapa.csv"
    with open(mapa_csv_path, "w", encoding="utf-8") as f:
        for row in mapa_csv_rows:
            f.write(",".join(f'"{c}"' if "," in c else c for c in row) + "\n")
    print(f"-> Mapa gerado em {mapa_csv_path}")

    # 3. Otimizar Imagens em paralelo
    print(f"\nOtimizando {len(image_tasks)} fotos (máx 1600px, WebP q80)...")
    workers = min(os.cpu_count() or 4, 12)
    img_ok, img_skip, img_err = 0, 0, 0
    with ProcessPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(optimize_image_worker, t): t for t in image_tasks}
        for fut in as_completed(futures):
            dst, status = fut.result()
            if status == "ok":
                img_ok += 1
            elif status == "skipped":
                img_skip += 1
            else:
                img_err += 1
                print(f"Erro na imagem {dst}: {status}")
    print(f"Fotos concluídas: {img_ok} convertidas, {img_skip} já existentes puladas, {img_err} erros.")

    # 4. Otimizar Vídeos em paralelo
    print(f"\nOtimizando {len(video_tasks)} vídeos (720p H.264 sem áudio, capa WebP)...")
    vid_workers = min(os.cpu_count() or 4, 6)
    vid_ok, vid_skip, vid_err = 0, 0, 0
    with ProcessPoolExecutor(max_workers=vid_workers) as executor:
        futures = {executor.submit(optimize_video_worker, t): t for t in video_tasks}
        for fut in as_completed(futures):
            dst, status = fut.result()
            if status == "ok":
                vid_ok += 1
            elif status == "skipped":
                vid_skip += 1
            else:
                vid_err += 1
                print(f"Erro no vídeo {dst}: {status}")
    print(f"Vídeos concluídos: {vid_ok} convertidos, {vid_skip} já existentes pulados, {vid_err} erros.")

    # 5. Gerar arquivo SQL alternativo para importação direta
    sql_path = IMPORTACAO_DIR / "import_catalog.sql"
    with open(sql_path, "w", encoding="utf-8") as sql_f:
        sql_f.write("-- Script de inserção em massa para Catálogo Cotton Pima\n\n")
        for p in products_data:
            p_id = str(uuid.uuid4())
            tit = p['titulo'].replace("'", "''")
            desc = p['descricao'].replace("'", "''")
            slug = p['slug']
            cod = p['codigo']
            ordem = p['index']
            sql_f.write(f"-- {cod}: {tit}\n")
            sql_f.write(f"""INSERT INTO public.produtos (id, nome, codigo_modelo, slug, descricao, composicao, categoria_id, ativo, destaque, ordem, estoque)
VALUES ('{p_id}', '{tit}', '{cod}', '{slug}', '{desc}', '100% algodão Pima', '{CATEGORIA_PIMA_ID}', false, false, {ordem}, 0)
ON CONFLICT (codigo_modelo) DO NOTHING;\n""")
            
            # faixas de preço
            sql_f.write(f"""INSERT INTO public.faixas_preco (produto_id, quantidade_minima, preco_peca)
SELECT id, q, 0.00 FROM public.produtos WHERE codigo_modelo = '{cod}'
CROSS JOIN (VALUES (10), (20), (30), (50)) as f(q)
ON CONFLICT (produto_id, quantidade_minima) DO NOTHING;\n""")

            # mídias
            for m in p["midias"]:
                url = m["url"]
                capa = f"'{m['capa_url']}'" if m.get("capa_url") else "NULL"
                principal = "true" if m["principal"] else "false"
                ordem_m = m["ordem"]
                tipo = m["tipo"]
                sql_f.write(f"""INSERT INTO public.produto_midias (produto_id, tipo, url, capa_url, ordem, principal)
SELECT id, '{tipo}', '{url}', {capa}, {ordem_m}, {principal} FROM public.produtos WHERE codigo_modelo = '{cod}'
ON CONFLICT DO NOTHING;\n""")
            sql_f.write("\n")
    print(f"-> Script SQL gerado em {sql_path}")

    # 6. Sincronização com Supabase
    env = load_env()
    print("\nVerificando credenciais do Supabase no .env...")
    success, msg = upload_to_supabase(env, products_data)
    print(f"Status do banco: {msg}")

    # 7. Resumo / Relatório
    print("\n================== RELATÓRIO DE EXECUÇÃO ==================")
    print(f"Total de produtos processados: {len(products_data)}")
    total_fotos = sum(p["qtd_fotos"] for p in products_data)
    total_videos = sum(p["qtd_videos"] for p in products_data)
    print(f"Total de mídias otimizadas: {total_fotos} fotos + {total_videos} vídeos = {total_fotos + total_videos} mídias")
    print(f"Pastas com menos de 10 imagens: {len(pastas_menos_10_imagens)}")
    if pastas_menos_10_imagens:
        for folder_name, count in pastas_menos_10_imagens:
            print(f"  - {folder_name}: {count} fotos")
    else:
        print("  - Nenhuma pasta com menos de 10 fotos.")

    print(f"Nomes trocados por 'Modelo NN': {len(nomes_trocados)}")
    if nomes_trocados:
        for folder_name, novo_nome, cod in nomes_trocados:
            print(f"  - {folder_name} -> {novo_nome} ({cod})")
    else:
        print("  - Nenhum (nenhuma pasta continha nome direto de marca registrada de terceiros).")
    print("===========================================================\n")

if __name__ == "__main__":
    main()
