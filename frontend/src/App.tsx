import { useEffect, useMemo, useRef, useState } from 'react'
import { useMemo, useState } from 'react'
import { Rnd } from 'react-rnd'
import './App.css'

type PaperSizeKey = 'A4' | 'A4Landscape' | 'Letter'

type DbRecord = {
  名前: string
  年齢: number
  性別: string
  住所: string
}

type ConditionOperator = 'equals' | 'notEquals' | 'contains'

type ConditionSetting = {
  enabled: boolean
  column: keyof DbRecord | ''
  operator: ConditionOperator
  value: string
  trueText: string
  falseText: string
}

type BaseItem = {
  id: string
  type: CanvasItemType
  x: number
  y: number
  width: number
  height: number
}

type CanvasItemType = 'text' | 'data' | 'rectangle' | 'line'

type TextItem = BaseItem & {
  type: 'text'
  text: string
  fontSize: number
  bold: boolean
  align: 'left' | 'center' | 'right'
}

type DataItem = BaseItem & {
  type: 'data'
  column: keyof DbRecord | ''
  fontSize: number
  bold: boolean
  align: 'left' | 'center' | 'right'
  prefix: string
  suffix: string
  emptyFallback: string
  condition: ConditionSetting
}

type RectangleItem = BaseItem & {
  type: 'rectangle'
  background: string
  borderColor: string
  borderWidth: number
  borderRadius: number
}

type LineItem = BaseItem & {
  type: 'line'
  color: string
  thickness: number
  orientation: 'horizontal' | 'vertical'
}

type CanvasItem = TextItem | DataItem | RectangleItem | LineItem

// 用紙サイズの定義（mm）
const PAPER_SIZES: Record<PaperSizeKey, { label: string; width: number; height: number }> = {
  A4: { label: 'A4（縦）', width: 210, height: 297 },
  A4Landscape: { label: 'A4（横）', width: 297, height: 210 },
  Letter: { label: 'レター', width: 215.9, height: 279.4 },
}

// ダミーのDBレコード
const DB_SAMPLE: DbRecord = {
  名前: '山田 太郎',
  年齢: 32,
  性別: '男性',
  住所: '東京都千代田区丸の内1-1-1',
}

// mmをpxへ換算（96dpi想定）
const mmToPx = (mm: number) => (mm / 25.4) * 96

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

const dbColumns = Object.keys(DB_SAMPLE) as (keyof DbRecord)[]

const isDbColumn = (value: string): value is keyof DbRecord =>
  (dbColumns as string[]).includes(value)

const injectDbPlaceholders = (text: string) =>
  text.replace(/\{([^{}]+)\}/g, (_, rawKey: string) => {
    const key = rawKey.trim()
    if (isDbColumn(key)) {
      const recordValue = DB_SAMPLE[key]
      return recordValue !== undefined && recordValue !== null ? String(recordValue) : ''
    }
    return `{${rawKey}}`
  })
const justifyMap = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
} as const

const alignToJustify = (align: 'left' | 'center' | 'right') => justifyMap[align]

function App() {
  const [paperSize, setPaperSize] = useState<PaperSizeKey | null>(null)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [items, setItems] = useState<CanvasItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const activePaper = paperSize ? PAPER_SIZES[paperSize] : null
  const pageSizePx = useMemo(() => {
    if (!activePaper) return { width: 0, height: 0 }
    return {
      width: mmToPx(activePaper.width),
      height: mmToPx(activePaper.height),
    }
  }, [activePaper])

  const selectedItem = items.find((item) => item.id === selectedId) || null

  useEffect(() => {
    if (!isPanning) return

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - panStartRef.current.x
      const deltaY = event.clientY - panStartRef.current.y
      setPan({
        x: panStartRef.current.panX + deltaX,
        y: panStartRef.current.panY + deltaY,
      })
    }

    const handleMouseUp = () => {
      setIsPanning(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isPanning])

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if (event.target !== event.currentTarget) return

    setIsPanning(true)
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    }
    event.preventDefault()
  }

  // アイテムを新規追加
  const handleAddItem = (type: CanvasItemType) => {
    if (!activePaper) return
    const base: BaseItem = {
      id: generateId(),
      type,
      x: 40,
      y: 40,
      width: 160,
      height: 60,
    }

    if (type === 'text') {
      const textItem: TextItem = {
        ...base,
        type: 'text',
        text: 'テキスト',
        fontSize: 16,
        bold: false,
        align: 'left',
      }
      setItems((prev) => [...prev, textItem])
      setSelectedId(textItem.id)
    } else if (type === 'data') {
      const dataItem: DataItem = {
        ...base,
        type: 'data',
        column: '',
        fontSize: 16,
        bold: false,
        align: 'left',
        prefix: '',
        suffix: '',
        emptyFallback: '（未設定）',
        condition: {
          enabled: false,
          column: '名前',
          operator: 'equals',
          value: '',
          trueText: '',
          falseText: '',
        },
      }
      setItems((prev) => [...prev, dataItem])
      setSelectedId(dataItem.id)
    } else if (type === 'rectangle') {
      const rectItem: RectangleItem = {
        ...base,
        type: 'rectangle',
        background: '#f5f5f5',
        borderColor: '#999999',
        borderWidth: 1,
        borderRadius: 4,
      }
      setItems((prev) => [...prev, rectItem])
      setSelectedId(rectItem.id)
    } else if (type === 'line') {
      const lineItem: LineItem = {
        ...base,
        type: 'line',
        height: 2,
        thickness: 2,
        orientation: 'horizontal',
        color: '#333333',
      }
      setItems((prev) => [...prev, lineItem])
      setSelectedId(lineItem.id)
    }
  }

  // アイテムの更新
  const handleItemUpdate = <T extends Partial<CanvasItem>>(id: string, payload: T) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? ({ ...item, ...payload } as CanvasItem) : item)),
    )
  }

  const applyLineResize = (
    target: LineItem,
    nextWidth: number,
    nextHeight: number,
    position: { x: number; y: number },
  ) => {
    const rawThickness = target.orientation === 'horizontal' ? nextHeight : nextWidth
    const thickness = Math.max(rawThickness, 1)

    handleItemUpdate(target.id, {
      width: target.orientation === 'horizontal' ? nextWidth : thickness,
      height: target.orientation === 'horizontal' ? thickness : nextHeight,
      x: position.x,
      y: position.y,
      thickness,
    })
  }

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    setSelectedId((prev) => (prev === id ? null : prev))
  }

  // if条件の判定
  const evaluateCondition = (dataItem: DataItem) => {
    const { condition } = dataItem
    if (!condition.enabled || !condition.column) {
      return null
    }
    const sourceValue = String(DB_SAMPLE[condition.column] ?? '')
    const target = condition.value
    let matched = false
    if (condition.operator === 'equals') {
      matched = sourceValue === target
    } else if (condition.operator === 'notEquals') {
      matched = sourceValue !== target
    } else if (condition.operator === 'contains') {
      matched = sourceValue.includes(target)
    }
    return matched ? condition.trueText : condition.falseText
  }

  const renderPreviewText = (item: DataItem) => {
    const value = item.column ? DB_SAMPLE[item.column] : null
    const evaluated = evaluateCondition(item)
    if (evaluated !== null && evaluated !== undefined && evaluated !== '') {
      return evaluated
    }
    if (value === null || value === undefined || value === '') {
      return item.emptyFallback
    }
    return `${item.prefix}${value}${item.suffix}`
  }

  const resetDocument = () => {
    setItems([])
    setSelectedId(null)
    setPan({ x: 0, y: 0 })
    setIsPanning(false)
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="mode-switch">
          <button
            className={mode === 'edit' ? 'active' : ''}
            onClick={() => setMode('edit')}
          >
            作成ウインドウ
          </button>
          <button
            className={mode === 'preview' ? 'active' : ''}
            onClick={() => setMode('preview')}
          >
            プレビュー
          </button>
        </div>
        <div className="header-controls">
          <label className="paper-select">
            <span>用紙サイズ</span>
            <select
              value={paperSize ?? ''}
              onChange={(event) => {
                const next = event.target.value as PaperSizeKey
                setPaperSize(next)
                setTimeout(() => {
                  setItems([])
                  setSelectedId(null)
                  setPan({ x: 0, y: 0 })
                  setIsPanning(false)
                }, 0)
              }}
            >
              <option value="" disabled>
                選択してください
              </option>
              {Object.entries(PAPER_SIZES).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </label>
          <button className="reset-button" onClick={resetDocument}>
            レイアウトをリセット
          </button>
        </div>
      </header>

      {mode === 'edit' && activePaper ? (
        <div className="workspace">
          <div className="canvas-panel">
            <div className="zoom-control">
              <label>
                ズーム {Math.round(zoom * 100)}%
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                />
              </label>
              <div className="zoom-buttons">
                <button onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.1))}>-</button>
                <button onClick={() => setZoom((prev) => Math.min(2, prev + 0.1))}>+</button>
              </div>
            </div>
            <div className={`canvas-wrapper ${isPanning ? 'panning' : ''}`}>
              <div
                className={`canvas-surface ${isPanning ? 'is-panning' : ''}`}
                style={{
                  width: pageSizePx.width,
                  height: pageSizePx.height,
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
                onMouseDown={handleCanvasMouseDown}
            <div className="canvas-wrapper">
              <div
                className="canvas-surface"
                style={{
                  width: pageSizePx.width,
                  height: pageSizePx.height,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                {items.map((item) => {
                  if (item.type === 'line') {
                    return (
                      <Rnd
                        key={item.id}
                        bounds="parent"
                        size={{ width: item.width, height: item.height }}
                        position={{ x: item.x, y: item.y }}
                        scale={zoom}
                        enableResizing={{
                          top: true,
                          right: true,
                          bottom: true,
                          left: true,
                        }}
                        onDragStop={(_, data) => {
                          handleItemUpdate(item.id, { x: data.x, y: data.y })
                        }}
                        onResize={(_, __, ref, ___, position) => {
                          applyLineResize(item, ref.offsetWidth, ref.offsetHeight, position)
                        }}
                        onResizeStop={(_, __, ref, ___, position) => {
                          applyLineResize(item, ref.offsetWidth, ref.offsetHeight, position)
                        enableResizing={
                          item.orientation === 'horizontal'
                            ? { left: true, right: true }
                            : { top: true, bottom: true }
                        }
                        onDragStop={(_, data) => {
                          handleItemUpdate(item.id, { x: data.x, y: data.y })
                        }}
                        onResizeStop={(_, __, ref, ___, position) => {
                          handleItemUpdate(item.id, {
                            width: ref.offsetWidth,
                            height: ref.offsetHeight,
                            x: position.x,
                            y: position.y,
                          })
                        }}
                        onMouseDown={() => setSelectedId(item.id)}
                        className={`canvas-item ${selectedId === item.id ? 'selected' : ''}`}
                      >
                        <div
                          className="line-item"
                          style={{
                            backgroundColor: item.color,
                            width: '100%',
                            height: '100%',
                          }}
                        />
                      </Rnd>
                    )
                  }

                  return (
                    <Rnd
                      key={item.id}
                      bounds="parent"
                      size={{ width: item.width, height: item.height }}
                      position={{ x: item.x, y: item.y }}
                      scale={zoom}
                      onDragStop={(_, data) => {
                        handleItemUpdate(item.id, { x: data.x, y: data.y })
                      }}
                      onResizeStop={(_, __, ref, ___, position) => {
                        handleItemUpdate(item.id, {
                          width: ref.offsetWidth,
                          height: ref.offsetHeight,
                          x: position.x,
                          y: position.y,
                        })
                      }}
                      onMouseDown={() => setSelectedId(item.id)}
                      className={`canvas-item ${selectedId === item.id ? 'selected' : ''}`}
                    >
                      {item.type === 'text' && (
                        <div
                          className="text-item"
                          style={{
                            fontSize: item.fontSize,
                            fontWeight: item.bold ? 700 : 400,
                            textAlign: item.align,
                            justifyContent: alignToJustify(item.align),
                          }}
                        >
                          <span>{injectDbPlaceholders(item.text)}</span>
                          <span>{item.text}</span>
                        </div>
                      )}
                      {item.type === 'data' && (
                        <div
                          className="text-item data-item"
                          style={{
                            fontSize: item.fontSize,
                            fontWeight: item.bold ? 700 : 400,
                            textAlign: item.align,
                            justifyContent: alignToJustify(item.align),
                          }}
                        >
                          <span>{item.column ? `{{${item.column}}}` : 'データ未設定'}</span>
                        </div>
                      )}
                      {item.type === 'rectangle' && (
                        <div
                          className="shape-item"
                          style={{
                            backgroundColor: item.background,
                            borderColor: item.borderColor,
                            borderWidth: item.borderWidth,
                            borderRadius: item.borderRadius,
                          }}
                        />
                      )}
                    </Rnd>
                  )
                })}
              </div>
            </div>
          </div>
          <aside className="sidebar">
            <section>
              <h2>アイテム追加</h2>
              <div className="item-buttons">
                <button onClick={() => handleAddItem('text')}>テキストボックス</button>
                <button onClick={() => handleAddItem('data')}>データボックス</button>
                <button onClick={() => handleAddItem('rectangle')}>長方形</button>
                <button onClick={() => handleAddItem('line')}>線</button>
              </div>
            </section>
            <section>
              <h2>プロパティ</h2>
              {selectedItem ? (
                <div className="property-panel">
                  <div className="property-row">
                    <label>位置 X</label>
                    <input
                      type="number"
                      value={Math.round(selectedItem.x)}
                      onChange={(event) =>
                        handleItemUpdate(selectedItem.id, { x: Number(event.target.value) })
                      }
                    />
                  </div>
                  <div className="property-row">
                    <label>位置 Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedItem.y)}
                      onChange={(event) =>
                        handleItemUpdate(selectedItem.id, { y: Number(event.target.value) })
                      }
                    />
                  </div>
                  <div className="property-row">
                    <label>幅</label>
                    <input
                      type="number"
                      value={Math.round(selectedItem.width)}
                      onChange={(event) =>
                        handleItemUpdate(selectedItem.id, { width: Number(event.target.value) })
                      }
                    />
                  </div>
                  <div className="property-row">
                    <label>高さ</label>
                    <input
                      type="number"
                      value={Math.round(selectedItem.height)}
                      onChange={(event) =>
                        handleItemUpdate(selectedItem.id, { height: Number(event.target.value) })
                      }
                    />
                  </div>

                  {selectedItem.type === 'text' && (
                    <>
                      <div className="property-row">
                        <label>テキスト</label>
                        <textarea
                          value={selectedItem.text}
                          onChange={(event) =>
                            handleItemUpdate(selectedItem.id, { text: event.target.value })
                          }
                        />
                      </div>
                      <div className="property-row inline">
                        <label>文字サイズ</label>
                        <input
                          type="number"
                          value={selectedItem.fontSize}
                          onChange={(event) =>
                            handleItemUpdate(selectedItem.id, {
                              fontSize: Number(event.target.value),
                            })
                          }
                        />
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={selectedItem.bold}
                            onChange={(event) =>
                              handleItemUpdate(selectedItem.id, { bold: event.target.checked })
                            }
                          />
                          太字
                        </label>
                      </div>
                      <div className="property-row">
                        <label>整列</label>
                        <select
                          value={selectedItem.align}
                          onChange={(event) =>
                            handleItemUpdate(selectedItem.id, {
                              align: event.target.value as TextItem['align'],
                            })
                          }
                        >
                          <option value="left">左</option>
                          <option value="center">中央</option>
                          <option value="right">右</option>
                        </select>
                      </div>
                    </>
                  )}

                  {selectedItem.type === 'data' && (
                    <>
                      <div className="property-row">
                        <label>割り当てカラム</label>
                        <select
                          value={selectedItem.column}
                          onChange={(event) =>
                            handleItemUpdate(selectedItem.id, {
                              column: event.target.value as DataItem['column'],
                            })
                          }
                        >
                          <option value="">選択してください</option>
                          {dbColumns.map((column) => (
                            <option key={column} value={column}>
                              {column}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="property-row">
                        <label>プレフィックス</label>
                        <input
                          type="text"
                          value={selectedItem.prefix}
                          onChange={(event) =>
                            handleItemUpdate(selectedItem.id, { prefix: event.target.value })
                          }
                        />
                      </div>
                      <div className="property-row">
                        <label>サフィックス</label>
                        <input
                          type="text"
                          value={selectedItem.suffix}
                          onChange={(event) =>
                            handleItemUpdate(selectedItem.id, { suffix: event.target.value })
                          }
                        />
                      </div>
                      <div className="property-row">
                        <label>空欄時テキスト</label>
                        <input
                          type="text"
                          value={selectedItem.emptyFallback}
                          onChange={(event) =>
                            handleItemUpdate(selectedItem.id, {
                              emptyFallback: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="property-row inline">
                        <label>文字サイズ</label>
                        <input
                          type="number"
                          value={selectedItem.fontSize}
                          onChange={(event) =>
                            handleItemUpdate(selectedItem.id, {
                              fontSize: Number(event.target.value),
                            })
                          }
                        />
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={selectedItem.bold}
                            onChange={(event) =>
                              handleItemUpdate(selectedItem.id, { bold: event.target.checked })
                            }
                          />
                          太字
                        </label>
                      </div>
                      <div className="property-row">
                        <label>整列</label>
                        <select
                          value={selectedItem.align}
                          onChange={(event) =>
                            handleItemUpdate(selectedItem.id, {
                              align: event.target.value as DataItem['align'],
                            })
                          }
                        >
                          <option value="left">左</option>
                          <option value="center">中央</option>
                          <option value="right">右</option>
                        </select>
                      </div>
                      <div className="property-row">
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={selectedItem.condition.enabled}
                            onChange={(event) =>
                              handleItemUpdate(selectedItem.id, {
                                condition: {
                                  ...selectedItem.condition,
                                  enabled: event.target.checked,
                                },
                              })
                            }
                          />
                          条件付き表示（if）
                        </label>
                      </div>
                      {selectedItem.condition.enabled && (
                        <div className="condition-editor">
                          <div className="property-row">
                            <label>参照カラム</label>
                            <select
                              value={selectedItem.condition.column}
                              onChange={(event) =>
                                handleItemUpdate(selectedItem.id, {
                                  condition: {
                                    ...selectedItem.condition,
                                    column: event.target.value as ConditionSetting['column'],
                                  },
                                })
                              }
                            >
                              {dbColumns.map((column) => (
                                <option key={column} value={column}>
                                  {column}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="property-row">
                            <label>判定方法</label>
                            <select
                              value={selectedItem.condition.operator}
                              onChange={(event) =>
                                handleItemUpdate(selectedItem.id, {
                                  condition: {
                                    ...selectedItem.condition,
                                    operator: event.target.value as ConditionOperator,
                                  },
                                })
                              }
                            >
                              <option value="equals">一致</option>
                              <option value="notEquals">不一致</option>
                              <option value="contains">含む</option>
                            </select>
                          </div>
                          <div className="property-row">
                            <label>比較値</label>
                            <input
                              type="text"
                              value={selectedItem.condition.value}
                              onChange={(event) =>
                                handleItemUpdate(selectedItem.id, {
                                  condition: {
                                    ...selectedItem.condition,
                                    value: event.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="property-row">
                            <label>true時テキスト</label>
                            <input
                              type="text"
                              value={selectedItem.condition.trueText}
                              onChange={(event) =>
                                handleItemUpdate(selectedItem.id, {
                                  condition: {
                                    ...selectedItem.condition,
                                    trueText: event.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                          <div className="property-row">
                            <label>false時テキスト</label>
                            <input
                              type="text"
                              value={selectedItem.condition.falseText}
                              onChange={(event) =>
                                handleItemUpdate(selectedItem.id, {
                                  condition: {
                                    ...selectedItem.condition,
                                    falseText: event.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedItem.type === 'rectangle' && (
                    <>
                      <div className="property-row">
                        <label>塗り</label>
                        <input
                          type="color"
                          value={selectedItem.background}
                          onChange={(event) =>
                            handleItemUpdate(selectedItem.id, {
                              background: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="property-row">
                        <label>枠線色</label>
                        <input
                          type="color"
                          value={selectedItem.borderColor}
                          onChange={(event) =>
                            handleItemUpdate(selectedItem.id, {
                              borderColor: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="property-row inline">
                        <label>枠線幅</label>
                        <input
                          type="number"
                          value={selectedItem.borderWidth}
                          onChange={(event) =>
                            handleItemUpdate(selectedItem.id, {
                              borderWidth: Number(event.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="property-row inline">
                        <label>角丸</label>
                        <input
                          type="number"
                          value={selectedItem.borderRadius}
                          onChange={(event) =>
                            handleItemUpdate(selectedItem.id, {
                              borderRadius: Number(event.target.value),
                            })
                          }
                        />
                      </div>
                    </>
                  )}

                  {selectedItem.type === 'line' && (
                    <>
                      <div className="property-row">
                        <label>線色</label>
                        <input
                          type="color"
                          value={selectedItem.color}
                          onChange={(event) =>
                            handleItemUpdate(selectedItem.id, {
                              color: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="property-row">
                        <label>太さ</label>
                        <input
                          type="number"
                          value={selectedItem.thickness}
                          onChange={(event) => {
                            const thickness = Number(event.target.value)
                            handleItemUpdate(selectedItem.id, {
                              thickness,
                              height:
                                selectedItem.orientation === 'horizontal'
                                  ? thickness
                                  : selectedItem.height,
                              width:
                                selectedItem.orientation === 'vertical'
                                  ? thickness
                                  : selectedItem.width,
                            })
                          }}
                        />
                      </div>
                      <div className="property-row">
                        <label>方向</label>
                        <select
                          value={selectedItem.orientation}
                          onChange={(event) => {
                            const orientation = event.target.value as LineItem['orientation']
                            const currentLength =
                              selectedItem.orientation === 'horizontal'
                                ? selectedItem.width
                                : selectedItem.height
                            const currentThickness =
                              selectedItem.orientation === 'horizontal'
                                ? selectedItem.height
                                : selectedItem.width
                            handleItemUpdate(selectedItem.id, {
                              orientation,
                              width:
                                orientation === 'horizontal'
                                  ? currentLength
                                  : currentThickness,
                              height:
                                orientation === 'vertical'
                                  ? currentLength
                                  : currentThickness,
                              thickness: Math.max(currentThickness, 1),
                                  ? Math.max(selectedItem.width, 120)
                                  : selectedItem.thickness,
                              height:
                                orientation === 'vertical'
                                  ? Math.max(selectedItem.height, 120)
                                  : selectedItem.thickness,
                            })
                          }}
                        >
                          <option value="horizontal">水平</option>
                          <option value="vertical">垂直</option>
                        </select>
                      </div>
                    </>
                  )}

                  <button
                    className="delete-button"
                    onClick={() => handleDelete(selectedItem.id)}
                  >
                    削除
                  </button>
                </div>
              ) : (
                <p className="empty-state">アイテムを選択すると詳細を編集できます。</p>
              )}
            </section>
            <section>
              <h2>参照データ</h2>
              <table className="data-preview">
                <tbody>
                  {dbColumns.map((column) => (
                    <tr key={column}>
                      <th>{column}</th>
                      <td>{DB_SAMPLE[column]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </aside>
        </div>
      ) : null}

      {mode === 'preview' && activePaper ? (
        <div className="preview-area">
          <div
            className="preview-page"
            style={{ width: pageSizePx.width, height: pageSizePx.height }}
          >
            {items.map((item) => {
              if (item.type === 'text') {
                return (
                  <div
                    key={item.id}
                    className="preview-item"
                    style={{
                      left: item.x,
                      top: item.y,
                      width: item.width,
                      height: item.height,
                      fontSize: item.fontSize,
                      fontWeight: item.bold ? 700 : 400,
                      textAlign: item.align,
                      justifyContent: alignToJustify(item.align),
                    }}
                  >
                    <span>{injectDbPlaceholders(item.text)}</span>
                    <span>{item.text}</span>
                  </div>
                )
              }
              if (item.type === 'data') {
                return (
                  <div
                    key={item.id}
                    className="preview-item"
                    style={{
                      left: item.x,
                      top: item.y,
                      width: item.width,
                      height: item.height,
                      fontSize: item.fontSize,
                      fontWeight: item.bold ? 700 : 400,
                      textAlign: item.align,
                      justifyContent: alignToJustify(item.align),
                    }}
                  >
                    <span>{renderPreviewText(item)}</span>
                  </div>
                )
              }
              if (item.type === 'rectangle') {
                return (
                  <div
                    key={item.id}
                    className="preview-shape"
                    style={{
                      left: item.x,
                      top: item.y,
                      width: item.width,
                      height: item.height,
                      backgroundColor: item.background,
                      borderColor: item.borderColor,
                      borderWidth: item.borderWidth,
                      borderRadius: item.borderRadius,
                    }}
                  />
                )
              }
              return (
                <div
                  key={item.id}
                  className="preview-line"
                  style={{
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                    backgroundColor: item.color,
                  }}
                />
              )
            })}
          </div>
          <aside className="preview-side">
            <h2>プレビュー中のデータ</h2>
            <p>ダミーデータを使用しています。</p>
            <ul>
              {dbColumns.map((column) => (
                <li key={column}>
                  <strong>{column}：</strong>
                  <span>{DB_SAMPLE[column]}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : null}

      {!paperSize && (
        <div className="paper-overlay">
          <div className="paper-dialog">
            <h1>新規書類のサイズを選択</h1>
            <p>先に用紙サイズを選択してください。</p>
            <select value="" onChange={(event) => setPaperSize(event.target.value as PaperSizeKey)}>
              <option value="" disabled>
                サイズを選択
              </option>
              {Object.entries(PAPER_SIZES).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
