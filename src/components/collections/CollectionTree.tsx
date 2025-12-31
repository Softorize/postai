import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  MoreHorizontal,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useCollectionsStore } from '@/stores/collections.store'
import { useTabsStore } from '@/stores/tabs.store'
import { Collection, Folder as FolderType, Request, HttpMethod } from '@/types'

interface CollectionTreeProps {
  searchQuery: string
}

export function CollectionTree({ searchQuery }: CollectionTreeProps) {
  const { collections, isLoading } = useCollectionsStore()

  const filteredCollections = searchQuery
    ? collections.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : collections

  if (isLoading) {
    return (
      <div className="p-4 text-text-secondary text-sm text-center">
        Loading collections...
      </div>
    )
  }

  if (filteredCollections.length === 0) {
    return (
      <div className="p-4 text-text-secondary text-sm text-center">
        {searchQuery ? 'No collections found' : 'No collections yet'}
      </div>
    )
  }

  return (
    <div className="py-1">
      {filteredCollections.map((collection) => (
        <CollectionItem key={collection.id} collection={collection} />
      ))}
    </div>
  )
}

function CollectionItem({ collection }: { collection: Collection }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1.5 hover:bg-white/5 cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="p-0.5">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
          )}
        </button>
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-yellow-500" />
        ) : (
          <Folder className="w-4 h-4 text-yellow-500" />
        )}
        <span className="flex-1 text-sm truncate">{collection.name}</span>
        <button
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded"
          onClick={(e) => {
            e.stopPropagation()
            // TODO: Show context menu
          }}
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-text-secondary" />
        </button>
      </div>

      {isExpanded && (
        <div className="ml-4">
          {/* Folders */}
          {collection.folders?.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              collectionId={collection.id}
            />
          ))}

          {/* Root-level requests */}
          {collection.requests
            ?.filter((r) => !r.folder)
            .map((request) => (
              <RequestItem
                key={request.id}
                request={request}
                collectionId={collection.id}
              />
            ))}
        </div>
      )}
    </div>
  )
}

function FolderItem({
  folder,
  collectionId,
}: {
  folder: FolderType
  collectionId: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1.5 hover:bg-white/5 cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="p-0.5">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-secondary" />
          )}
        </button>
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-blue-400" />
        ) : (
          <Folder className="w-4 h-4 text-blue-400" />
        )}
        <span className="flex-1 text-sm truncate">{folder.name}</span>
      </div>

      {isExpanded && (
        <div className="ml-4">
          {/* Subfolders */}
          {folder.subfolders?.map((subfolder) => (
            <FolderItem
              key={subfolder.id}
              folder={subfolder}
              collectionId={collectionId}
            />
          ))}

          {/* Requests in folder */}
          {folder.requests?.map((request) => (
            <RequestItem
              key={request.id}
              request={request}
              collectionId={collectionId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RequestItem({
  request,
}: {
  request: Request
  collectionId: string
}) {
  const { openTab } = useTabsStore()

  const handleClick = () => {
    openTab({
      type: 'request',
      title: request.name,
      data: request,
    })
  }

  const methodColors: Record<HttpMethod, string> = {
    GET: 'text-method-get',
    POST: 'text-method-post',
    PUT: 'text-method-put',
    PATCH: 'text-method-patch',
    DELETE: 'text-method-delete',
    HEAD: 'text-purple-400',
    OPTIONS: 'text-gray-400',
  }

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 cursor-pointer group"
      onClick={handleClick}
    >
      <span
        className={clsx(
          'text-[10px] font-bold w-10 text-center',
          methodColors[request.method]
        )}
      >
        {request.method}
      </span>
      <span className="flex-1 text-sm truncate">{request.name}</span>
      <button
        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded"
        onClick={(e) => {
          e.stopPropagation()
          // TODO: Show context menu
        }}
      >
        <MoreHorizontal className="w-3.5 h-3.5 text-text-secondary" />
      </button>
    </div>
  )
}
