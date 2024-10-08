import os, json, requests, mimetypes, hashlib, string, runpod

import random, time
import torch
import numpy as np
from PIL import Image
import nodes
from nodes import NODE_CLASS_MAPPINGS
from comfy_extras import nodes_custom_sampler
from comfy_extras import nodes_flux
from comfy import model_management

DualCLIPLoader = NODE_CLASS_MAPPINGS["DualCLIPLoader"]()
UNETLoader = NODE_CLASS_MAPPINGS["UNETLoader"]()
VAELoader = NODE_CLASS_MAPPINGS["VAELoader"]()

LoraLoader = NODE_CLASS_MAPPINGS["LoraLoader"]()
FluxGuidance = nodes_flux.NODE_CLASS_MAPPINGS["FluxGuidance"]()
RandomNoise = nodes_custom_sampler.NODE_CLASS_MAPPINGS["RandomNoise"]()
BasicGuider = nodes_custom_sampler.NODE_CLASS_MAPPINGS["BasicGuider"]()
KSamplerSelect = nodes_custom_sampler.NODE_CLASS_MAPPINGS["KSamplerSelect"]()
BasicScheduler = nodes_custom_sampler.NODE_CLASS_MAPPINGS["BasicScheduler"]()
SamplerCustomAdvanced = nodes_custom_sampler.NODE_CLASS_MAPPINGS["SamplerCustomAdvanced"]()
VAELoader = NODE_CLASS_MAPPINGS["VAELoader"]()
VAEDecode = NODE_CLASS_MAPPINGS["VAEDecode"]()
EmptyLatentImage = NODE_CLASS_MAPPINGS["EmptyLatentImage"]()

with torch.inference_mode():
    clip = DualCLIPLoader.load_clip("t5xxl_fp16.safetensors", "clip_l.safetensors", "flux")[0]
    unet = UNETLoader.load_unet("flux1-dev.sft", "default")[0]
    vae = VAELoader.load_vae("ae.sft")[0]

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
    lora_strength_model = values['lora_strength_model']
    lora_strength_clip = values['lora_strength_clip']
    sampler_name = values['sampler_name']
    scheduler = values['scheduler']
    lora_file = values['lora_file']

    if seed == 0:
        random.seed(int(time.time()))
        seed = random.randint(0, 18446744073709551615)
    print(seed)

    global unet, clip
    unet_lora, clip_lora = LoraLoader.load_lora(unet, clip, lora_file, lora_strength_model, lora_strength_clip)
    cond, pooled = clip_lora.encode_from_tokens(clip_lora.tokenize(positive_prompt), return_pooled=True)
    cond = [[cond, {"pooled_output": pooled}]]
    cond = FluxGuidance.append(cond, guidance)[0]
    noise = RandomNoise.get_noise(seed)[0]
    guider = BasicGuider.get_guider(unet_lora, cond)[0]
    sampler = KSamplerSelect.get_sampler(sampler_name)[0]
    sigmas = BasicScheduler.get_sigmas(unet_lora, scheduler, steps, 1.0)[0]
    latent_image = EmptyLatentImage.generate(closestNumber(width, 16), closestNumber(height, 16))[0]
    sample, sample_denoised = SamplerCustomAdvanced.sample(noise, guider, sampler, sigmas, latent_image)
    decoded = VAEDecode.decode(vae, sample)[0].detach()
    Image.fromarray(np.array(decoded*255, dtype=np.uint8)[0]).save("/content/flux-comic-tost.png")

    result = "/content/flux-comic-tost.png"
    presigned_response, upload_response, file_name = upload_file_to_uploadthing(result)
    image_url = presigned_response.json()['data'][0]['fileUrl']
    return {"file": file_name, "result": image_url, "status": "DONE"}

runpod.serverless.start({"handler": generate})