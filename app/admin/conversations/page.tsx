'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  DownloadCloud, 
  Search, 
  MessageCircle, 
  Calendar, 
  BarChart, 
  Filter, 
  ArrowUpDown,
  MessageSquare,
  Loader2
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

// Define conversation type
type Conversation = {
  id: string;
  userId: string;
  userName: string;
  messagesCount: number;
  lastActive: string;
  model: string;
  visibility: string;
  title: string;
}

// Define response type
type ConversationsResponse = {
  conversations: Conversation[];
  totalCount: number;
  limit: number;
  offset: number;
}

export default function ConversationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalConversations: 0,
    activeToday: 0,
    avgMessagesPerChat: 0,
    mostUsedModel: 'Loading...'
  });
  const router = useRouter();

  // Function to fetch conversations
  const fetchConversations = async (status: string, search: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status !== 'all') params.append('status', status);
      
      const response = await fetch(`/api/admin/conversations?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      
      const data: ConversationsResponse = await response.json();
      setConversations(data.conversations.map(conv => ({
        ...conv,
        // Set default status based on visibility for now
        status: conv.visibility === 'public' ? 'active' : 'archived'
      })));
      setTotalCount(data.totalCount);
      
      // Calculate stats
      if (data.conversations.length > 0) {
        const totalMessages = data.conversations.reduce((sum, conv) => sum + (conv.messagesCount || 0), 0);
        const avgMessages = totalMessages / data.conversations.length;
        
        // Count conversations with activity today
        const today = new Date().toISOString().split('T')[0];
        const activeToday = data.conversations.filter(conv => {
          const convDate = new Date(conv.lastActive).toISOString().split('T')[0];
          return convDate === today;
        }).length;
        
        // Find most used model (placeholder as we don't track models in DB yet)
        // In a real implementation, you'd get this from your database
        
        setStats({
          totalConversations: data.totalCount,
          activeToday,
          avgMessagesPerChat: Number.parseFloat(avgMessages.toFixed(1)),
          mostUsedModel: 'GPT-4' // Placeholder
        });
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to fetch data on component mount and when filters change
  useEffect(() => {
    fetchConversations(status, searchQuery);
  }, [status, searchQuery]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setStatus(value);
  };
  
  function formatDate(dateString: string) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Handle viewing a conversation
  const handleViewConversation = (conversationId: string) => {
    router.push(`/chat/${conversationId}`);
  };

  // Handle archiving or restoring a conversation
  const handleVisibilityChange = async (conversationId: string, newVisibility: 'public' | 'private') => {
    setIsUpdating(conversationId);
    try {
      const response = await fetch(`/api/admin/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visibility: newVisibility }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update conversation visibility');
      }

      // Update local state to reflect the change
      setConversations(conversations.map(conv => 
        conv.id === conversationId 
          ? { ...conv, visibility: newVisibility } 
          : conv
      ));

      toast({
        title: newVisibility === 'public' ? 'Conversation restored' : 'Conversation archived',
        description: newVisibility === 'public' 
          ? 'The conversation is now visible to users.'
          : 'The conversation is now archived.',
      });
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update the conversation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Conversation Analytics</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <DownloadCloud className="mr-2 size-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 size-4" />
            Filter
          </Button>
          <Button size="sm">
            <BarChart className="mr-2 size-4" />
            Analysis
          </Button>
        </div>
      </div>

      {/* Conversation Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Conversations
            </CardTitle>
            <MessageSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From all users
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Today
            </CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeToday}</div>
            <p className="text-xs text-muted-foreground">
              Conversations today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Messages Per Chat
            </CardTitle>
            <MessageCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgMessagesPerChat}</div>
            <p className="text-xs text-muted-foreground">
              Messages per conversation
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Most Used Model
            </CardTitle>
            <BarChart className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mostUsedModel}</div>
            <p className="text-xs text-muted-foreground">
              Based on usage data
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Conversation List */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation Management</CardTitle>
          <CardDescription>
            View and manage all chat conversations in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <Tabs defaultValue="all" className="w-full" onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="all">All Conversations</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-3 px-4 text-left text-sm">
                        <div className="flex items-center gap-1">
                          Title
                          <ArrowUpDown className="ml-1 size-4" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-left text-sm">User</th>
                      <th className="py-3 px-4 text-left text-sm">Messages</th>
                      <th className="py-3 px-4 text-left text-sm">Visibility</th>
                      <th className="py-3 px-4 text-left text-sm">Last Active</th>
                      <th className="py-3 px-4 text-left text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center">
                          <div className="flex justify-center items-center">
                            <Loader2 className="size-6 animate-spin mr-2" />
                            <span>Loading conversations...</span>
                          </div>
                        </td>
                      </tr>
                    ) : conversations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center">
                          No conversations found
                        </td>
                      </tr>
                    ) : (
                      conversations.map((conversation) => (
                        <tr key={conversation.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div className="font-medium">{conversation.title || "Untitled"}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">ID: {conversation.id}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">{conversation.userName || "Unknown"}</div>
                            <div className="text-xs text-muted-foreground">ID: {conversation.userId}</div>
                          </td>
                          <td className="py-3 px-4">{conversation.messagesCount || 0}</td>
                          <td className="py-3 px-4">{conversation.visibility}</td>
                          <td className="py-3 px-4">{formatDate(conversation.lastActive)}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewConversation(conversation.id)}
                              >
                                View
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleVisibilityChange(
                                  conversation.id, 
                                  conversation.visibility === 'public' ? 'private' : 'public'
                                )}
                                disabled={isUpdating === conversation.id}
                              >
                                {isUpdating === conversation.id ? (
                                  <Loader2 className="size-4 mr-1 animate-spin" />
                                ) : null}
                                {conversation.visibility === 'public' ? 'Archive' : 'Restore'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
                {isLoading ? 'Loading...' : `Showing ${conversations.length} of ${totalCount} conversations`}
              </div>
            </TabsContent>
            
            <TabsContent value="active" className="mt-4">
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-3 px-4 text-left text-sm">
                        <div className="flex items-center gap-1">
                          Title
                          <ArrowUpDown className="ml-1 size-4" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-left text-sm">User</th>
                      <th className="py-3 px-4 text-left text-sm">Messages</th>
                      <th className="py-3 px-4 text-left text-sm">Visibility</th>
                      <th className="py-3 px-4 text-left text-sm">Last Active</th>
                      <th className="py-3 px-4 text-left text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center">
                          <div className="flex justify-center items-center">
                            <Loader2 className="size-6 animate-spin mr-2" />
                            <span>Loading conversations...</span>
                          </div>
                        </td>
                      </tr>
                    ) : conversations.filter(c => c.visibility === 'public').length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center">
                          No active conversations found
                        </td>
                      </tr>
                    ) : (
                      conversations
                        .filter(conv => conv.visibility === 'public')
                        .map((conversation) => (
                          <tr key={conversation.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="font-medium">{conversation.title || "Untitled"}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]">ID: {conversation.id}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{conversation.userName || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">ID: {conversation.userId}</div>
                            </td>
                            <td className="py-3 px-4">{conversation.messagesCount || 0}</td>
                            <td className="py-3 px-4">{conversation.visibility}</td>
                            <td className="py-3 px-4">{formatDate(conversation.lastActive)}</td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleViewConversation(conversation.id)}
                                >
                                  View
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleVisibilityChange(conversation.id, 'private')}
                                  disabled={isUpdating === conversation.id}
                                >
                                  {isUpdating === conversation.id ? (
                                    <Loader2 className="size-4 mr-1 animate-spin" />
                                  ) : null}
                                  Archive
                                </Button>
                              </div>
                            </td>
                          </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
                {isLoading 
                  ? 'Loading...' 
                  : `Showing ${conversations.filter(c => c.visibility === 'public').length} active conversations`}
              </div>
            </TabsContent>
            
            <TabsContent value="archived" className="mt-4">
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-3 px-4 text-left text-sm">
                        <div className="flex items-center gap-1">
                          Title
                          <ArrowUpDown className="ml-1 size-4" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-left text-sm">User</th>
                      <th className="py-3 px-4 text-left text-sm">Messages</th>
                      <th className="py-3 px-4 text-left text-sm">Visibility</th>
                      <th className="py-3 px-4 text-left text-sm">Last Active</th>
                      <th className="py-3 px-4 text-left text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center">
                          <div className="flex justify-center items-center">
                            <Loader2 className="size-6 animate-spin mr-2" />
                            <span>Loading conversations...</span>
                          </div>
                        </td>
                      </tr>
                    ) : conversations.filter(c => c.visibility === 'private').length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center">
                          No archived conversations found
                        </td>
                      </tr>
                    ) : (
                      conversations
                        .filter(conv => conv.visibility === 'private')
                        .map((conversation) => (
                          <tr key={conversation.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="font-medium">{conversation.title || "Untitled"}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[150px]">ID: {conversation.id}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{conversation.userName || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">ID: {conversation.userId}</div>
                            </td>
                            <td className="py-3 px-4">{conversation.messagesCount || 0}</td>
                            <td className="py-3 px-4">{conversation.visibility}</td>
                            <td className="py-3 px-4">{formatDate(conversation.lastActive)}</td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleViewConversation(conversation.id)}
                                >
                                  View
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleVisibilityChange(conversation.id, 'public')}
                                  disabled={isUpdating === conversation.id}
                                >
                                  {isUpdating === conversation.id ? (
                                    <Loader2 className="size-4 mr-1 animate-spin" />
                                  ) : null}
                                  Restore
                                </Button>
                              </div>
                            </td>
                          </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
                {isLoading 
                  ? 'Loading...' 
                  : `Showing ${conversations.filter(c => c.visibility === 'private').length} archived conversations`}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}