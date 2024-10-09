'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Rnd } from 'react-rnd'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, Trash2, Image as ImageIcon, ZoomIn, ZoomOut, RefreshCw, Printer, Download, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface BubbleState {
  id: string
  text: string
  fontSize: number
  fontFamily: string
  arrowPosition: number
  arrowRotation: number
  arrowOffsetX: number
  arrowOffsetY: number
  position: { x: number; y: number }
  size: { width: number; height: number }
  panelIndex: number
  arrowColor: 'white' | 'black'
  arrowSize: number
}

interface ImageState {
  src: string
  zoom: number
  x: number
  y: number
}

function SpeechBubble({ 
  state, 
  onSelect, 
  onStateChange,
  onDelete,
  isPrinting
}: { 
  state: BubbleState
  onSelect: (id: string) => void
  onStateChange: (id: string, newState: Partial<BubbleState>) => void
  onDelete: (id: string) => void
  isPrinting: boolean
}) {
  const { id, text, fontSize, fontFamily, arrowPosition, arrowRotation, arrowOffsetX, arrowOffsetY, position, size, arrowColor, arrowSize } = state
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [isDraggingArrow, setIsDraggingArrow] = useState(false)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.fontSize = `${fontSize}px`
      textareaRef.current.style.fontFamily = fontFamily
    }
  }, [fontSize, fontFamily])

  const updateState = (newState: Partial<BubbleState>) => {
    onStateChange(id, newState)
  }

  const handleArrowDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!bubbleRef.current || !isDraggingArrow) return

    const rect = bubbleRef.current.getBoundingClientRect()
    const bubbleWidth = rect.width
    const bubbleHeight = rect.height
    const perimeter = 2 * (bubbleWidth + bubbleHeight)

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    let distance = 0

    if (mouseY < 0) {
      distance = mouseX
    } else if (mouseX > bubbleWidth) {
      distance = bubbleWidth + mouseY
    } else if (mouseY > bubbleHeight) {
      distance = 2 * bubbleWidth + bubbleHeight - mouseX
    } else if (mouseX < 0) {
      distance = 2 * (bubbleWidth + bubbleHeight) - mouseY
    }

    const newPosition = Math.max(0, Math.min(1, distance / perimeter))
    updateState({ arrowPosition: newPosition })
  }

  const getArrowStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: '0',
      height: '0',
      borderStyle: 'solid',
      position: 'absolute',
      zIndex: -1,
      cursor: 'move',
    }

    const perimeter = 2 * (size.width + size.height)
    const position = arrowPosition * perimeter

    let x = 0
    let y = 0
    let rotation = arrowRotation

    if (position < size.width) {
      // Top edge
      x = position
      y = -arrowSize
      rotation += 0
    } else if (position < size.width + size.height) {
      // Right edge
      x = size.width - (arrowSize / 1.5)
      y = position - size.width
      rotation += 90
    } else if (position < 2 * size.width + size.height) {
      // Bottom edge
      x = 2 * size.width + size.height - position - arrowSize
      y = size.height - (arrowSize * 1.1)
      rotation += 180
    } else {
      // Left edge
      x = -(arrowSize / 2)
      y = perimeter - position - arrowSize
      rotation += 270
    }

    return {
      ...baseStyle,
      left: x + arrowOffsetX,
      top: y + arrowOffsetY,
      borderWidth: `0 ${arrowSize / 2}px ${arrowSize}px ${arrowSize / 2}px`,
      borderColor: `transparent transparent ${arrowColor} transparent`,
      transform: `rotate(${rotation}deg)`,
      transformOrigin: '50% 100%',
    }
  }

  return (
    <Rnd
      size={size}
      position={position}
      onDragStop={(e, d) => updateState({ position: { x: d.x, y: d.y } })}
      onResize={(e, direction, ref, delta, position) => {
        updateState({
          size: { width: ref.offsetWidth, height: ref.offsetHeight },
          position
        })
      }}
      bounds="parent"
      minWidth={100}
      minHeight={50}
      onClick={() => onSelect(id)}
    >
      <div 
        ref={bubbleRef} 
        className="relative w-full h-full bg-white border-2 border-white rounded-lg speech-bubble cursor-move"
        onMouseMove={handleArrowDrag}
        onMouseUp={() => setIsDraggingArrow(false)}
        onMouseLeave={() => setIsDraggingArrow(false)}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => updateState({ text: e.target.value })}
          className="w-full h-full resize-none outline-none p-2 bg-transparent cursor-text rounded-lg"
          aria-label="Speech bubble text"
        />
        {!isPrinting && (
          <Button
            className="absolute top-0 right-0 p-1 bg-destructive text-destructive-foreground rounded-bl"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(id)
            }}
            aria-label="Delete speech bubble"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <div
          style={getArrowStyle()}
          onMouseDown={(e) => {
            e.stopPropagation()
            setIsDraggingArrow(true)
          }}
          aria-hidden="true"
        />
      </div>
    </Rnd>
  )
}

export default function ComicCreator() {
  const [selectedBubble, setSelectedBubble] = useState<string | null>(null)
  const [bubbleStates, setBubbleStates] = useState<BubbleState[]>([])
  const [images, setImages] = useState<ImageState[]>(Array(4).fill({ src: "", zoom: 1, x: 0, y: 0 }))
  const [isPrinting, setIsPrinting] = useState(false)
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number }>({ isDragging: false, startX: 0, startY: 0 })
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const canvasRef = useRef<HTMLDivElement>(null)
  const [activeImagePanel, setActiveImagePanel] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const [imageInputs, setImageInputs] = useState({
    positive_prompt: "Juaner_cartoon, A curious mermaid with long blue hair, wearing a necklace made of seashells, holding a glowing pearl, swimming through an underwater cave filled with shimmering treasures and ancient ruins.",
    seed: 0,
    steps: 20,
    guidance: 3.5,
    lora_file: "j_cartoon_flux_bf16.safetensors",
    lora_strength_model: 1,
    lora_strength_clip: 1,
    sampler_name: "euler",
    scheduler: "simple",
    width: 1024,
    height: 1024
  })

  const loraOptions = [
    "j_cartoon_flux_bf16.safetensors",
    "bw_pixel_anime_v1.0.safetensors",
    "ueno.safetensors",
    "immoralgirl.safetensors",
    "manga_style_f1d.safetensors",
    "berserk_manga_style_flux.safetensors",
    "Manga_and_Anime_cartoon_style_v1.safetensors"
  ]

  const updateBubbleState = (id: string, newState: Partial<BubbleState>) => {
    setBubbleStates(prevStates => 
      prevStates.map(state => 
        state.id === id ? { ...state, ...newState } : state
      )
    )
  }

  const addNewBubble = (panelIndex: number) => {
    const newBubble: BubbleState = {
      id: Date.now().toString(),
      text: "New Bubble",
      fontSize: 16,
      fontFamily: 'Arial',
      arrowPosition: 0,
      arrowRotation: 0,
      arrowOffsetX: 0,
      arrowOffsetY: 0,
      position: { x: 50, y: 50 },
      size: { width: 200, height: 100 },
      panelIndex,
      arrowColor: 'black',
      arrowSize: 20,
    }
    setBubbleStates(prevStates => [...prevStates, newBubble])
    setSelectedBubble(newBubble.id)
  }

  const removeSelectedBubble = (id: string) => {
    setBubbleStates(prevStates => prevStates.filter(state => state.id !== id))
    setSelectedBubble(null)
  }

  const handleImageUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const newImages = [...images]
        newImages[index] = { src: e.target?.result as string, zoom: 1, x: 0, y: 0 }
        setImages(newImages)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleReplaceImage = (index: number) => {
    fileInputRefs.current[index]?.click()
  }

  const handleZoom = (index: number, direction: 'in' | 'out') => {
    const newImages = [...images]
    const currentZoom = newImages[index].zoom
    newImages[index].zoom = direction === 'in' ? Math.min(currentZoom + 0.1, 3) : Math.max(currentZoom - 0.1, 0.5)
    setImages(newImages)
  }

  const handleMouseDown = (index: number, e: React.MouseEvent<HTMLDivElement>) => {
    dragRef.current = { isDragging: true, startX: e.clientX - images[index].x, startY: e.clientY - images[index].y }
  }

  const handleMouseMove = useCallback((index: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging) return
    const newImages = [...images]
    newImages[index].x = e.clientX - dragRef.current.startX
    newImages[index].y = e.clientY - dragRef.current.startY
    setImages(newImages)
  }, [images])

  const handleMouseUp = () => {
    dragRef.current.isDragging = false
  }

  const handleExport = async (type: 'pdf' | 'png') => {
    if (!canvasRef.current) return

    setIsPrinting(true)
    
    // Wait for the state to update and re-render
    await new Promise(resolve => setTimeout(resolve, 0))

    try {
      const canvas = await html2canvas(canvasRef.current, {
        scale: 2, // Increase resolution
        useCORS: true, // Allow loading cross-origin images
        logging: false, // Disable logging
      })

      if (type === 'pdf') {
        const imgData = canvas.toDataURL('image/jpeg', 1.0)
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [canvas.width, canvas.height]
        })

        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height)
        pdf.save('comic.pdf')
      } else {
        const link = document.createElement('a')
        link.download = 'comic.png'
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
    } catch (error) {
      console.error('Error generating export:', error)
    } finally {
      setIsPrinting(false)
    }
  }

  const handleInputChange = (name: string, value: string | number) => {
    setImageInputs(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleGenerateImage = async () => {
    if (activeImagePanel === null) return
    setIsGenerating(true)

    try {
      const response = await fetch('https://comic.camenduru.workers.dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input: imageInputs })
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const data = await response.json()
      if (data.output && data.output.result) {
        const newImages = [...images]
        setTimeout(() => {
          newImages[activeImagePanel] = { src: data.output.result, zoom: 1, x: 0, y: 0 };
          setImages(newImages);
        }, 1000);
      }
    } catch (error) {
      console.error('Error generating image:', error)
    } finally {
      setIsGenerating(false)
      setIsDialogOpen(false)
    }
  }

  const renderPanel = (index: number) => (
    <div className="relative h-full bg-gray-700 flex items-center justify-center overflow-hidden">
      {images[index].src ? (
        <div 
          className="relative w-full h-full cursor-move"
          onMouseDown={(e) => handleMouseDown(index, e)}
          onMouseMove={(e) => handleMouseMove(index, e)}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            style={{
              transform: `translate(${images[index].x}px, ${images[index].y}px) scale(${images[index].zoom})`,
              transition: 'transform 0.1s',
              width: '100%',
              height: '100%',
              backgroundImage: `url(${images[index].src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          {!isPrinting && (
            <div className="absolute bottom-2 right-2 flex space-x-2">
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={() => handleZoom(index, 'in')}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="secondary" 
                onClick={() => handleZoom(index, 'out')}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleReplaceImage(index)}
                aria-label="Replace image"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <label htmlFor={`upload-${index}`} className="cursor-pointer flex flex-col items-center">
          <ImageIcon className="w-8 h-8 mb-2" />
          <span>Upload Image</span>
        </label>
      )}
      <input
        id={`upload-${index}`}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => handleImageUpload(index, e)}
        ref={(el) => {fileInputRefs.current[index] = el}}
      />
      {bubbleStates.filter(state => state.panelIndex === index).map((state) => (
        <SpeechBubble
          key={state.id}
          state={state}
          onSelect={setSelectedBubble}
          onStateChange={updateBubbleState}
          onDelete={removeSelectedBubble}
          isPrinting={isPrinting}
        />
      ))}
      {!isPrinting && (
        <div className="absolute bottom-2 left-2 flex space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => addNewBubble(index)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Bubble
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setActiveImagePanel(index)
                  setIsDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate Image
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Image</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="positive_prompt" className="text-right">
                    Prompt
                  </Label>
                  <Input
                    id="positive_prompt"
                    value={imageInputs.positive_prompt}
                    onChange={(e) => handleInputChange('positive_prompt', e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="seed" className="text-right">
                    Seed
                  </Label>
                  <Input
                    id="seed"
                    type="number"
                    value={imageInputs.seed}
                    onChange={(e) => handleInputChange('seed', parseInt(e.target.value))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="steps" className="text-right">
                    Steps
                  </Label>
                  <Input
                    id="steps"
                    type="number"
                    value={imageInputs.steps}
                    onChange={(e) => handleInputChange('steps', parseInt(e.target.value))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="guidance" className="text-right">
                    Guidance
                  </Label>
                  <Input
                    id="guidance"
                    type="number"
                    step="0.1"
                    value={imageInputs.guidance}
                    onChange={(e) => handleInputChange('guidance', parseFloat(e.target.value))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="lora_file" className="text-right">
                    Lora File
                  </Label>
                  <Select
                    value={imageInputs.lora_file}
                    onValueChange={(value) => handleInputChange('lora_file', value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select Lora File" />
                    </SelectTrigger>
                    <SelectContent>
                      {loraOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="lora_strength_model" className="text-right">
                    Lora Strength Model
                  </Label>
                  <Input
                    id="lora_strength_model"
                    type="number"
                    step="0.1"
                    value={imageInputs.lora_strength_model}
                    onChange={(e) => handleInputChange('lora_strength_model', parseFloat(e.target.value))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="lora_strength_clip" className="text-right">
                    Lora Strength Clip
                  </Label>
                  <Input
                    id="lora_strength_clip"
                    type="number"
                    step="0.1"
                    value={imageInputs.lora_strength_clip}
                    onChange={(e) => handleInputChange('lora_strength_clip', parseFloat(e.target.value))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sampler_name" className="text-right">
                    Sampler Name
                  </Label>
                  <Input
                    id="sampler_name"
                    value={imageInputs.sampler_name}
                    onChange={(e) => handleInputChange('sampler_name', e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="scheduler" className="text-right">
                    Scheduler
                  </Label>
                  <Input
                    id="scheduler"
                    value={imageInputs.scheduler}
                    onChange={(e) => handleInputChange('scheduler', e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="width" className="text-right">
                    Width
                  </Label>
                  <Input
                    id="width"
                    type="number"
                    value={imageInputs.width}
                    onChange={(e) => handleInputChange('width', parseInt(e.target.value))}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="height" className="text-right">
                    Height
                  </Label>
                  <Input
                    id="height"
                    type="number"
                    value={imageInputs.height}
                    onChange={(e) => handleInputChange('height', parseInt(e.target.value))}
                    className="col-span-3"
                  />
                </div>
              </div>
              <Button onClick={handleGenerateImage} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )

  const selectedState = bubbleStates.find(state => state.id === selectedBubble)

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className="flex-1 flex flex-col">
        <Card className="flex-1 bg-gray-800 border-hidden" ref={canvasRef}>
          <ResizablePanelGroup direction="vertical" className="h-full">
            <ResizablePanel defaultSize={50}>
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={50}>
                  {renderPanel(0)}
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={50}>
                  {renderPanel(1)}
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50}>
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={50}>
                  {renderPanel(2)}
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={50}>
                  {renderPanel(3)}
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </Card>
      </div>
      <div className="w-64 bg-white p-4 shadow-lg space-y-4 text-black overflow-y-auto flex flex-col h-full">
        <h2 className="text-lg font-bold">Bubble Settings</h2>
        {selectedState ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Font Size</label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="12"
                  max="120"
                  value={selectedState.fontSize}
                  onChange={(e) => updateBubbleState(selectedState.id, { fontSize: Number(e.target.value) })}
                  className="w-full"
                />
                <input
                  type="number"
                  min="12"
                  max="120"
                  value={selectedState.fontSize}
                  onChange={(e) => updateBubbleState(selectedState.id, { fontSize: Math.min(120, Math.max(12, Number(e.target.value))) })}
                  className="w-16 p-1 border rounded"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Font Family</label>
              <select
                value={selectedState.fontFamily}
                onChange={(e) => updateBubbleState(selectedState.id, { fontFamily: e.target.value })}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="Arial">Arial</option>
                <option value="Verdana">Verdana</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier">Courier</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Arrow Position</label>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[selectedState.arrowPosition]}
                onValueChange={(value) => updateBubbleState(selectedState.id, { arrowPosition: value[0] })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Arrow Rotation</label>
              <Slider
                min={0}
                max={360}
                step={1}
                value={[selectedState.arrowRotation]}
                onValueChange={(value) => updateBubbleState(selectedState.id, { arrowRotation: value[0] })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Arrow Offset</label>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateBubbleState(selectedState.id, { arrowOffsetX: selectedState.arrowOffsetX - 1 })}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateBubbleState(selectedState.id, { arrowOffsetX: selectedState.arrowOffsetX + 1 })}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateBubbleState(selectedState.id, { arrowOffsetY: selectedState.arrowOffsetY - 1 })}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateBubbleState(selectedState.id, { arrowOffsetY: selectedState.arrowOffsetY + 1 })}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Arrow Color</label>
              <div className="flex items-center space-x-2 mt-1">
                <span>Black</span>
                <Switch
                  checked={selectedState.arrowColor === 'white'}
                  onCheckedChange={(checked)  => updateBubbleState(selectedState.id, { arrowColor: checked ? 'white' : 'black' })}
                />
                <span>White</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Arrow Size</label>
              <Slider
                min={10}
                max={50}
                step={1}
                value={[selectedState.arrowSize]}
                onValueChange={(value) => updateBubbleState(selectedState.id, { arrowSize: value[0] })}
                className="w-full"
              />
            </div>
          </>
        ) : (
          <p>Select a bubble to edit its properties</p>
        )}
        <Button onClick={() => handleExport('pdf')} className="w-full mb-2">
          <Printer className="h-4 w-4 mr-2" />
          Export as PDF
        </Button>
        <Button onClick={() => handleExport('png')} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Export as PNG
        </Button>
        <div className="flex-grow"></div>
        <div className="flex flex-col items-center mt-auto">
          <br />
          <a href="https://github.com/camenduru/react-comic" className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">🌐 Open Source</a>
          <br />
          <a href="https://tost.ai/" className="flex items-center text-yellow-600 hover:text-yellow-800 transition-colors">🥪 TostAI Manga Creator</a>
          <br />
          <a href="https://runpod.io/" className="flex items-center text-purple-600 hover:text-purple-800 transition-colors">
            <svg
              className="mr-2"
              focusable="false"
              aria-hidden="true"
              viewBox="0 0 100 200"
              style={{ height: '32px', width: '32px', fill: 'currentColor' }}
            >
              <g transform="translate(0, 10) scale(0.8)">
                <path d="M74.5 51.1c-25.4 14.9-27 16-29.6 20.2-1.8 3-1.9 5.3-1.9 32.3 0 21.7.3 29.4 1.3 30.6 1.9 2.5 46.7 27.9 48.5 27.6 1.5-.3 1.7-3.1 2-27.7.2-21.9 0-27.8-1.1-29.5-.8-1.2-9.9-6.8-20.2-12.6-10.3-5.8-19.4-11.5-20.2-12.7-1.8-2.6-.9-5.9 1.8-7.4 1.6-.8 6.3 0 21.8 4C87.8 78.7 98 81 99.6 81c4.4 0 49.9-25.9 49.9-28.4 0-1.6-3.4-2.8-24-8.2-13.2-3.5-25.1-6.3-26.5-6.3-1.4.1-12.4 5.9-24.5 13z" />
                <path d="m137.2 68.1-3.3 2.1 6.3 3.7c3.5 2 6.3 4.3 6.3 5.1 0 .9-8 6.1-19.4 12.6-10.6 6-20 11.9-20.7 12.9-1.2 1.6-1.4 7.2-1.2 29.4.3 24.8.5 27.6 2 27.9 1.8.3 46.6-25.1 48.6-27.6.9-1.2 1.2-8.8 1.2-30.2s-.3-29-1.2-30.2c-1.6-1.9-12.1-7.8-13.9-7.8-.8 0-2.9 1-4.7 2.1z" />
              </g>
            </svg>
            Powered By RunPod
          </a>
        </div>
      </div>
    </div>
  )
}