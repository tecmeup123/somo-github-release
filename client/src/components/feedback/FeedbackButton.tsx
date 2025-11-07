import { useState } from "react";
import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeedbackModal from "./FeedbackModal";

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        data-testid="button-feedback"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-[#DBAB00] p-0 shadow-lg transition-all hover:bg-[#DBAB00]/90 hover:scale-110 dark:bg-[#DBAB00] dark:hover:bg-[#DBAB00]/90"
        title="Report Bug or Feedback"
      >
        <Bug className="h-5 w-5 text-black" />
      </Button>

      <FeedbackModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
