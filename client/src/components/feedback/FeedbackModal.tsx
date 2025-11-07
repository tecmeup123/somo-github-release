import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSigner } from "@ckb-ccc/connector-react";

const feedbackSchema = z.object({
  category: z.enum(["bug", "feature", "ui", "performance", "other"]),
  description: z.string().min(10, "Please provide at least 10 characters"),
});

type FeedbackForm = z.infer<typeof feedbackSchema>;

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const { toast } = useToast();
  const signer = useSigner();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      category: "bug",
      description: "",
    },
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackForm) => {
      const userAddress = signer ? await signer.getAddresses() : null;
      
      return apiRequest("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          userAddress: userAddress?.[0] || null,
          page: window.location.pathname,
        }),
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Feedback Submitted",
        description: "Thank you for helping us improve SoMo!",
      });
      
      setTimeout(() => {
        onOpenChange(false);
        setIsSubmitted(false);
        form.reset();
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "Failed to submit feedback. Please try again.",
      });
    },
  });

  const onSubmit = (data: FeedbackForm) => {
    submitFeedbackMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-black dark:bg-black border-zinc-800 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#DBAB00] dark:text-[#DBAB00]">
            Report Bug or Feedback
          </DialogTitle>
          <DialogDescription className="text-zinc-400 dark:text-zinc-400">
            Help us improve SoMo by reporting bugs or suggesting features.
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 text-6xl">✅</div>
            <p className="text-lg font-semibold text-[#DBAB00] dark:text-[#DBAB00]">
              Thank you for your feedback!
            </p>
            <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-400">
              We appreciate you taking the time to help us improve.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-200 dark:text-zinc-200">Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger 
                          data-testid="select-feedback-category"
                          className="bg-zinc-900 dark:bg-zinc-900 border-zinc-800 dark:border-zinc-800 text-white dark:text-white"
                        >
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 dark:bg-zinc-900 border-zinc-800 dark:border-zinc-800">
                        <SelectItem value="bug" className="text-white dark:text-white hover:bg-zinc-800 dark:hover:bg-zinc-800">🐛 Bug Report</SelectItem>
                        <SelectItem value="feature" className="text-white dark:text-white hover:bg-zinc-800 dark:hover:bg-zinc-800">💡 Feature Request</SelectItem>
                        <SelectItem value="ui" className="text-white dark:text-white hover:bg-zinc-800 dark:hover:bg-zinc-800">🎨 UI/UX Issue</SelectItem>
                        <SelectItem value="performance" className="text-white dark:text-white hover:bg-zinc-800 dark:hover:bg-zinc-800">⚡ Performance</SelectItem>
                        <SelectItem value="other" className="text-white dark:text-white hover:bg-zinc-800 dark:hover:bg-zinc-800">📝 Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-200 dark:text-zinc-200">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        data-testid="textarea-feedback-description"
                        placeholder="Please describe the issue or suggestion in detail..."
                        className="min-h-[120px] resize-none bg-zinc-900 dark:bg-zinc-900 border-zinc-800 dark:border-zinc-800 text-white dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel-feedback"
                  className="border-zinc-700 dark:border-zinc-700 bg-zinc-900 dark:bg-zinc-900 text-white dark:text-white hover:bg-zinc-800 dark:hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitFeedbackMutation.isPending}
                  data-testid="button-submit-feedback"
                  className="bg-[#DBAB00] dark:bg-[#DBAB00] text-black dark:text-black hover:bg-[#DBAB00]/90 dark:hover:bg-[#DBAB00]/90"
                >
                  {submitFeedbackMutation.isPending ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
