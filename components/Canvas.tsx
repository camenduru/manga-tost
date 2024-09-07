'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Rnd } from 'react-rnd'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Plus, Trash2, Image as ImageIcon, ZoomIn, ZoomOut, RefreshCw, Printer, Download, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import dynamic from 'next/dynamic'

import html2canvas from 'html2canvas';
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
        <Button
          className="absolute bottom-2 left-2"
          size="sm"
          variant="secondary"
          onClick={() => addNewBubble(index)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Bubble
        </Button>
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
      <div className="w-64 bg-white p-4 shadow-lg space-y-4 text-black">
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
                  onCheckedChange={(checked) => updateBubbleState(selectedState.id, { arrowColor: checked ? 'white' : 'black' })}
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
      </div>
    </div>
  )
}