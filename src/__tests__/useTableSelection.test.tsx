import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTableSelection } from '@/hooks/useTableSelection'

interface Item {
  id: string
  name: string
}

const items: Item[] = [
  { id: 'a', name: 'Alice' },
  { id: 'b', name: 'Bob' },
  { id: 'c', name: 'Carol' },
]

const getId = (item: Item) => item.id

describe('useTableSelection', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useTableSelection(items, getId))
    expect(result.current.count).toBe(0)
    expect(result.current.selectedItems).toEqual([])
  })

  it('toggle adds and removes ids', () => {
    const { result } = renderHook(() => useTableSelection(items, getId))
    act(() => result.current.toggle('a'))
    expect(result.current.isSelected('a')).toBe(true)
    expect(result.current.count).toBe(1)
    act(() => result.current.toggle('a'))
    expect(result.current.isSelected('a')).toBe(false)
    expect(result.current.count).toBe(0)
  })

  it('selectAll replaces the set', () => {
    const { result } = renderHook(() => useTableSelection(items, getId))
    act(() => result.current.toggle('a'))
    act(() => result.current.selectAll(['b', 'c']))
    expect(result.current.isSelected('a')).toBe(false)
    expect(result.current.isSelected('b')).toBe(true)
    expect(result.current.count).toBe(2)
  })

  it('clear empties the set', () => {
    const { result } = renderHook(() => useTableSelection(items, getId))
    act(() => result.current.selectAll(['a', 'b']))
    act(() => result.current.clear())
    expect(result.current.count).toBe(0)
  })

  it('selectedItems reflects the current selection in items order', () => {
    const { result } = renderHook(() => useTableSelection(items, getId))
    act(() => result.current.selectAll(['c', 'a']))
    expect(result.current.selectedItems.map((i) => i.id)).toEqual(['a', 'c'])
  })

  it('selectedItems is empty when items list does not include selected ids', () => {
    const { result } = renderHook(() => useTableSelection<Item>([], getId))
    act(() => result.current.toggle('a'))
    expect(result.current.selectedIds.has('a')).toBe(true)
    expect(result.current.selectedItems).toEqual([])
  })
})
