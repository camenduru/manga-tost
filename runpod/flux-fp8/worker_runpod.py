import os, json, requests, mimetypes, hashlib, string, runpod

import random, time
import torch
from PIL import Image

from flux_pipeline import FluxPipeline
from util import load_config, ModelVersion

with torch.inference_mode():
    config = load_config(
        ModelVersion.flux_dev,
        flux_path="/content/models/unet/flux1-dev.sft",
        flux_device="cuda:0",
        ae_path="/content/models/vae/ae.sft",
        ae_device="cuda:0",
        text_enc_path="/content/models/clip",
        text_enc_device="cuda:0",
        flow_dtype="float16",
        text_enc_dtype="bfloat16",
        ae_dtype="bfloat16",
        compile_extras=True,
        compile_blocks=True,
        offload_flow=False,
        offload_text_enc=False
    )
    pipe = FluxPipeline.load_pipeline_from_config(config)
    pipe.load_lora(lora_path="/content/models/loras/j_cartoon_flux_bf16.safetensors", scale=1.0)

def closestNumber(n, m):
    q = int(n / m)
    n1 = m * q
    if (n * m) > 0:
        n2 = m * (q + 1)
    else:
        n2 = m * (q - 1)
    if abs(n - n1) < abs(n - n2):
        return n1
    return n2

def upload_file_to_uploadthing(file_path):
    file_name = os.path.basename(file_path)
    _, file_extension = os.path.splitext(file_name)
    random_string = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(8))
    md5_hash = hashlib.md5(random_string.encode()).hexdigest()
    file_name = md5_hash+file_extension
    file_size = os.path.getsize(file_path)
    file_type, _ = mimetypes.guess_type(file_path)
    with open(file_path, "rb") as file:
        file_content = file.read()
    file_info = {"name": file_name, "size": file_size, "type": file_type}
    uploadthing_api_key = os.getenv('uploadthing_api_key')
    headers = {"x-uploadthing-api-key": uploadthing_api_key}
    data = {"contentDisposition": "inline", "acl": "public-read", "files": [file_info]}
    presigned_response = requests.post("https://api.uploadthing.com/v6/uploadFiles", headers=headers, json=data)
    presigned_response.raise_for_status()
    presigned = presigned_response.json()["data"][0]
    upload_url = presigned["url"]
    fields = presigned["fields"]
    files = {"file": file_content}
    upload_response = requests.post(upload_url, data=fields, files=files)
    upload_response.raise_for_status()
    return presigned_response, upload_response, file_name

@torch.inference_mode()
def generate(input):
    values = input["input"]

    positive_prompt = values['positive_prompt']
    width = values['width']
    height = values['height']
    seed = values['seed']
    steps = values['steps']
    guidance = values['guidance']

    if seed == 0:
        random.seed(int(time.time()))
        seed = random.randint(0, 18446744073709551615)
    print(seed)
    
    positive_prompt = "Juaner_cartoon, " + positive_prompt
    image_stream = pipe.generate(prompt=positive_prompt,
                        width=closestNumber(width, 16),
                        height=closestNumber(height, 16),
                        num_steps=steps,
                        guidance=guidance,
                        seed=seed,
                        strength=1.0,
                        init_image=None)
    image = Image.open(image_stream)
    image.save("/content/flux-comic-tost.png")

    result = "/content/flux-comic-tost.png"
    presigned_response, upload_response, file_name = upload_file_to_uploadthing(result)
    image_url = presigned_response.json()['data'][0]['fileUrl']
    return {"file": file_name, "result": image_url, "status": "DONE"}

runpod.serverless.start({"handler": generate})