FROM runpod/pytorch:2.2.1-py3.10-cuda12.1.1-devel-ubuntu22.04
WORKDIR /content
ENV PATH="/home/camenduru/.local/bin:${PATH}"

RUN adduser --disabled-password --gecos '' camenduru && \
    adduser camenduru sudo && \
    echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers && \
    chown -R camenduru:camenduru /content && \
    chmod -R 777 /content && \
    chown -R camenduru:camenduru /home && \
    chmod -R 777 /home && \
    apt update -y && add-apt-repository -y ppa:git-core/ppa && apt update -y && apt install -y aria2 git git-lfs unzip ffmpeg

USER camenduru

RUN pip install -q opencv-python imageio imageio-ffmpeg ffmpeg-python av runpod \
    torch==2.4.0+cu124 torchvision==0.19.0+cu124 torchaudio==2.4.0+cu124 torchtext==0.18.0 torchdata==0.8.0 --extra-index-url https://download.pytorch.org/whl/cu124 \
    xformers==0.0.27.post2 ninja einops PyTurboJPEG pydantic fastapi bitsandbytes loguru transformers tokenizers sentencepiece click accelerate quanto pydash pybase64 uvicorn \
    https://github.com/camenduru/wheels/releases/download/runpod/cublas_ops-0.0.5-cp310-cp310-linux_x86_64.whl && \
    git clone https://github.com/aredden/flux-fp8-api /content/flux-fp8-api && \
    aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/flux1-dev.sft -d /content/models/unet -o flux1-dev.sft && \
    aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/city96/t5-v1_1-xxl-encoder-bf16/raw/main/config.json -d /content/models/clip -o config.json && \
    aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/city96/t5-v1_1-xxl-encoder-bf16/resolve/main/model.safetensors -d /content/models/clip -o model.safetensors && \
    aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/city96/t5-v1_1-xxl-encoder-bf16/raw/main/special_tokens_map.json -d /content/models/clip -o special_tokens_map.json && \
    aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/city96/t5-v1_1-xxl-encoder-bf16/resolve/main/spiece.model -d /content/models/clip -o spiece.model && \
    aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/city96/t5-v1_1-xxl-encoder-bf16/raw/main/tokenizer_config.json -d /content/models/clip -o tokenizer_config.json && \
    aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/camenduru/FLUX.1-dev/resolve/main/ae.sft -d /content/models/vae -o ae.sft && \
    aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/TostAI/flux-1-dev-lora/resolve/main/bw_pixel_anime_v1.0.safetensors -d /content/models/loras -o bw_pixel_anime_v1.0.safetensors && \
    aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/TostAI/flux-1-dev-lora/resolve/main/ueno.safetensors -d /content/models/loras -o ueno.safetensors && \
    aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/TostAI/flux-1-dev-lora/resolve/main/immoralgirl.safetensors -d /content/models/loras -o immoralgirl.safetensors && \
    aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/TostAI/flux-1-dev-lora/resolve/main/manga_style_f1d.safetensors -d /content/models/loras -o manga_style_f1d.safetensors && \
    aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/TostAI/flux-1-dev-lora/resolve/main/j_cartoon_flux_bf16.safetensors -d /content/models/loras -o j_cartoon_flux_bf16.safetensors && \
    aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/TostAI/flux-1-dev-lora/resolve/main/berserk_manga_style_flux.safetensors -d /content/models/loras -o berserk_manga_style_flux.safetensors && \
    aria2c --console-log-level=error -c -x 16 -s 16 -k 1M https://huggingface.co/TostAI/flux-1-dev-lora/resolve/main/Manga_and_Anime_cartoon_style_v1.safetensors -d /content/models/loras -o Manga_and_Anime_cartoon_style_v1.safetensors

COPY ./worker_runpod.py /content/flux-fp8-api/worker_runpod.py
WORKDIR /content/flux-fp8-api
CMD python worker_runpod.py