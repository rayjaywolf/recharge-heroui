"use client"

import { useSyncExternalStore } from "react"

const SYNC_EVENT_NAME = "retailer-notifications-sync"
const EMPTY_IDS: string[] = []
const snapshotCache = new Map<string, { raw: string | null; parsed: string[] }>()

function parseIds(value: string | null): string[] {
  if (!value) return EMPTY_IDS

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : EMPTY_IDS
  } catch {
    return EMPTY_IDS
  }
}

export function useNotificationReadIds(storageKey: string) {
  const subscribe = (onStoreChange: () => void) => {
    const onSync = () => onStoreChange()
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) onStoreChange()
    }

    window.addEventListener(SYNC_EVENT_NAME, onSync)
    window.addEventListener("storage", onStorage)

    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, onSync)
      window.removeEventListener("storage", onStorage)
    }
  }

  const getSnapshot = () => {
    const raw = localStorage.getItem(storageKey)
    const cached = snapshotCache.get(storageKey)

    if (cached && cached.raw === raw) {
      return cached.parsed
    }

    const parsed = parseIds(raw)
    snapshotCache.set(storageKey, { raw, parsed })
    return parsed
  }

  const getServerSnapshot = () => EMPTY_IDS

  const readIds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const persistReadIds = (nextReadIds: string[]) => {
    localStorage.setItem(storageKey, JSON.stringify(nextReadIds))
    window.dispatchEvent(new Event(SYNC_EVENT_NAME))
  }

  return { readIds, persistReadIds }
}
