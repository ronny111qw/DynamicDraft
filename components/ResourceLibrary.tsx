import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/use-toast'
import { FileText, Video, Book, Plus, Pencil, Trash } from 'lucide-react'

type Resource = {
  id: string
  title: string
  description: string
  url: string
  type: 'article' | 'video' | 'book'
}

type ResourceLibraryProps = {
  resources: Resource[]
  onAddResource: (resource: Omit<Resource, 'id'>) => void
  onEditResource: (id: string, resource: Partial<Resource>) => void
  onDeleteResource: (id: string) => void
}

export default function ResourceLibrary({
  resources,
  onAddResource,
  onEditResource,
  onDeleteResource
}: ResourceLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [newResource, setNewResource] = useState<Omit<Resource, 'id'>>({ title: '', description: '', url: '', type: 'article' })
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const filteredResources = resources.filter(resource => 
    (typeFilter === 'all' || resource.type === typeFilter) &&
    (resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     resource.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleAddResource = () => {
    if (newResource.title && newResource.description && newResource.url) {
      onAddResource(newResource)
      setNewResource({ title: '', description: '', url: '', type: 'article' })
      setIsAddDialogOpen(false)
      toast({
        title: "Resource Added",
        description: "The new resource has been added successfully.",
      })
    } else {
      toast({
        title: "Invalid Input",
        description: "Please fill in all fields.",
        variant: "destructive",
      })
    }
  }

  const handleEditResource = () => {
    if (editingResource) {
      onEditResource(editingResource.id, editingResource)
      setEditingResource(null)
      setIsEditDialogOpen(false)
      toast({
        title: "Resource Updated",
        description: "The resource has been updated successfully.",
      })
    }
  }

  const handleDeleteResource = (id: string) => {
    onDeleteResource(id)
    toast({
      title: "Resource Deleted",
      description: "The resource has been deleted successfully.",
    })
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Resource Library</CardTitle>
          <CardDescription className="text-gray-400">Manage and explore helpful resources for interview preparation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow bg-gray-800 text-white border-gray-700"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px] bg-gray-800 text-white border-gray-700">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 text-white border-gray-700">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="article">Articles</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="book">Books</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ScrollArea className="h-[400px]">
            {filteredResources.map((resource) => (
              <Card key={resource.id} className="mb-4 bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    {resource.type === 'article' && <FileText className="mr-2" />}
                    {resource.type === 'video' && <Video className="mr-2" />}
                    {resource.type === 'book' && <Book className="mr-2" />}
                    {resource.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-gray-300">
                  <p>{resource.description}</p>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    View Resource
                  </a>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="mr-2 text-white border-gray-700 hover:bg-gray-800" onClick={() => {
                    setEditingResource(resource)
                    setIsEditDialogOpen(true)
                  }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" onClick={() => handleDeleteResource(resource.id)}>
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-black hover:from-green-500 hover:to-blue-600">
                <Plus className="mr-2 h-4 w-4" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 text-white border-gray-800">
              <DialogHeader>
                <DialogTitle>Add New Resource</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Enter the details of the new resource you want to add.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-white">Title</Label>
                  <Input
                    id="title"
                    value={newResource.title}
                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                    className="bg-gray-800 text-white border-gray-700"
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    value={newResource.description}
                    onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                    className="bg-gray-800 text-white border-gray-700"
                  />
                </div>
                <div>
                  <Label htmlFor="url" className="text-white">URL</Label>
                  <Input
                    id="url"
                    value={newResource.url}
                    onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                    className="bg-gray-800 text-white border-gray-700"
                  />
                </div>
                <div>
                  <Label htmlFor="type" className="text-white">Type</Label>
                  <Select value={newResource.type} onValueChange={(value: 'article' | 'video' | 'book') => setNewResource({ ...newResource, type: value })}>
                    <SelectTrigger id="type" className="bg-gray-800 text-white border-gray-700">
                      <SelectValue placeholder="Select resource type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-white border-gray-700">
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="book">Book</SelectItem>
                    </SelectContent>
                  </Select>
                
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddResource} className="bg-green-500 text-black hover:bg-green-600">
                  Add Resource
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-900 text-white border-gray-800">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update the details of the selected resource.
            </DialogDescription>
          </DialogHeader>
          {editingResource && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title" className="text-white">Title</Label>
                <Input
                  id="edit-title"
                  value={editingResource.title}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div>
                <Label htmlFor="edit-description" className="text-white">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingResource.description}
                  onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div>
                <Label htmlFor="edit-url" className="text-white">URL</Label>
                <Input
                  id="edit-url"
                  value={editingResource.url}
                  onChange={(e) => setEditingResource({ ...editingResource, url: e.target.value })}
                  className="bg-gray-800 text-white border-gray-700"
                />
              </div>
              <div>
                <Label htmlFor="edit-type" className="text-white">Type</Label>
                <Select value={editingResource.type} onValueChange={(value: 'article' | 'video' | 'book') => setEditingResource({ ...editingResource, type: value })}>
                  <SelectTrigger id="edit-type" className="bg-gray-800 text-white border-gray-700">
                    <SelectValue placeholder="Select resource type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 text-white border-gray-700">
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="book">Book</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleEditResource} className="bg-green-500 text-black hover:bg-green-600">
              Update Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}