import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiService from '../services/api'
import toast from 'react-hot-toast'

export const useAPI = () => {
  const queryClient = useQueryClient()

  // Customers
  const useCustomers = (params?: any) => {
    return useQuery({
      queryKey: ['customers', params],
      queryFn: () => apiService.getCustomers(params),
    })
  }

  const useCustomerStats = () => {
    return useQuery({
      queryKey: ['customer-stats'],
      queryFn: () => apiService.getCustomerStats(),
    })
  }

  const useCreateCustomer = () => {
    return useMutation({
      mutationFn: apiService.createCustomer,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['customers'] })
        queryClient.invalidateQueries({ queryKey: ['customer-stats'] })
        toast.success('Customer created successfully!')
      },
    })
  }

  // Segments
  const useSegments = (params?: any) => {
    return useQuery({
      queryKey: ['segments', params],
      queryFn: () => apiService.getSegments(params),
    })
  }

  const useSegment = (id: number) => {
    return useQuery({
      queryKey: ['segment', id],
      queryFn: () => apiService.getSegmentById(id),
      enabled: !!id,
    })
  }

  const useSegmentStats = () => {
    return useQuery({
      queryKey: ['segment-stats'],
      queryFn: () => apiService.getSegmentStats(),
    })
  }

  const useCreateSegment = () => {
    return useMutation({
      mutationFn: apiService.createSegment,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['segments'] })
        queryClient.invalidateQueries({ queryKey: ['segment-stats'] })
        toast.success('Segment created successfully!')
      },
    })
  }

  const useUpdateSegment = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: any }) => 
        apiService.updateSegment(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['segments'] })
        queryClient.invalidateQueries({ queryKey: ['segment-stats'] })
        toast.success('Segment updated successfully!')
      },
    })
  }

  const useDeleteSegment = () => {
    return useMutation({
      mutationFn: apiService.deleteSegment,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['segments'] })
        queryClient.invalidateQueries({ queryKey: ['segment-stats'] })
        toast.success('Segment deleted successfully!')
      },
    })
  }

  const usePreviewAudience = () => {
    return useMutation({
      mutationFn: apiService.previewAudience,
    })
  }

  // Campaigns
  const useCampaigns = (params?: any) => {
    return useQuery({
      queryKey: ['campaigns', params],
      queryFn: () => apiService.getCampaigns(params),
    })
  }

  const useCampaign = (id: number) => {
    return useQuery({
      queryKey: ['campaign', id],
      queryFn: () => apiService.getCampaignById(id),
      enabled: !!id,
    })
  }

  const useCampaignStats = () => {
    return useQuery({
      queryKey: ['campaign-stats'],
      queryFn: () => apiService.getCampaignStats(),
    })
  }

  const useCreateCampaign = () => {
    return useMutation({
      mutationFn: apiService.createCampaign,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['campaigns'] })
        queryClient.invalidateQueries({ queryKey: ['campaign-stats'] })
        toast.success('Campaign created successfully!')
      },
    })
  }

  const useLaunchCampaign = () => {
    return useMutation({
      mutationFn: apiService.launchCampaign,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['campaigns'] })
        queryClient.invalidateQueries({ queryKey: ['campaign-stats'] })
        toast.success('Campaign launched successfully!')
      },
    })
  }

  const useGenerateAIMessages = () => {
    return useMutation({
      mutationFn: apiService.generateAIMessages,
    })
  }

  const useCampaignInsights = (id: number) => {
    return useQuery({
      queryKey: ['campaign-insights', id],
      queryFn: () => apiService.getCampaignInsights(id),
      enabled: !!id,
    })
  }

  return {
    // Customers
    useCustomers,
    useCustomerStats,
    useCreateCustomer,
    
    // Segments
    useSegments,
    useSegment,
    useSegmentStats,
    useCreateSegment,
    useUpdateSegment,
    useDeleteSegment,
    usePreviewAudience,
    
    // Campaigns
    useCampaigns,
    useCampaign,
    useCampaignStats,
    useCreateCampaign,
    useLaunchCampaign,
    useGenerateAIMessages,
    useCampaignInsights,
  }
}
