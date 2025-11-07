import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ccc } from "@ckb-ccc/connector-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CanvasStats } from "@/types/pixel";
import WalletModal from "@/components/wallet/WalletModal";
import Navigation from "@/components/layout/Navigation";
import FeedbackModal from "@/components/feedback/FeedbackModal";
import { Grid, Menu, Bug } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function Header() {
  const { open, wallet, disconnect } = ccc.useCcc();
  const signer = ccc.useSigner();
  const [userAddress, setUserAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("0");
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const hasAutoSynced = useRef<Set<string>>(new Set());

  // Auto-sync mutation for wallet connection
  const autoSyncMutation = useMutation({
    mutationFn: async (address: string) => {
      return await apiRequest('POST', `/api/wallet/sync`, { 
        walletAddress: address 
      });
    },
    onSuccess: (data: any, address: string) => {
      const { summary } = data;
      
      // Mark as synced on success
      hasAutoSynced.current.add(address);
      
      // Invalidate all wallet-related queries (match keys used in WalletModal)
      queryClient.invalidateQueries({ queryKey: [`/api/users/${address}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${address}/pixels`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${address}/transactions`] });
      queryClient.invalidateQueries({ queryKey: ['/api/leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pixels'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users', address] });
      
      // Silent auto-sync - only log to console
      console.log('Wallet auto-synced:', summary);
    },
    onError: (error: any, address: string) => {
      // Don't mark as synced on error - allow retry on next connection
      console.error('Auto-sync failed:', error);
    },
  });
  
  const { data: stats } = useQuery<CanvasStats>({
    queryKey: ['/api/stats'],
    refetchInterval: 5000,
  });

  const { data: userData } = useQuery({
    queryKey: ['/api/users', userAddress],
    enabled: !!userAddress,
  });

  useEffect(() => {
    if (!signer) {
      setUserAddress("");
      setBalance("0");
      return;
    }

    (async () => {
      try {
        const addr = await signer.getRecommendedAddress();
        setUserAddress(addr);
        
        const capacity = await signer.getBalance();
        setBalance(ccc.fixedPointToString(capacity));

        // Auto-sync wallet on connection (only once per address per session)
        if (!hasAutoSynced.current.has(addr)) {
          autoSyncMutation.mutate(addr);
        }
      } catch (error) {
        console.error("Error getting wallet info:", error);
      }
    })();
  }, [signer]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm" data-testid="header">
      <div className="container mx-auto px-4 py-2 md:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary via-secondary to-accent rounded-lg flex items-center justify-center shadow-md shadow-primary/20">
                <Grid className="w-4 h-4 md:w-5 md:h-5 text-background" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 md:w-3 md:h-3 bg-accent rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white font-display tracking-wide" data-testid="title">
              SoMo
            </h1>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-3">
            <Navigation />
            
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-primary/20 h-8 w-8 p-0"
                  data-testid="button-menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-black dark:bg-black border-zinc-800 dark:border-zinc-800">
                <SheetHeader>
                  <SheetTitle className="text-[#DBAB00] dark:text-[#DBAB00]">Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-white dark:text-white hover:bg-zinc-800 dark:hover:bg-zinc-800"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsFeedbackOpen(true);
                    }}
                    data-testid="button-menu-feedback"
                  >
                    <Bug className="mr-2 h-4 w-4" />
                    Report Bug / Feedback
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            
            {wallet ? (
              <WalletModal
                open={isWalletModalOpen}
                onOpenChange={setIsWalletModalOpen}
                userAddress={userAddress}
                balance={balance}
                walletName={wallet.name}
                walletIcon={wallet.icon}
                onDisconnect={disconnect}
              >
                <button 
                  className="px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-mono tracking-wide transition-all duration-300 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-white flex items-center gap-1 md:gap-1.5"
                  data-testid="button-wallet-info"
                >
                  <img src={wallet.icon} alt={wallet.name} className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Connected</span>
                  <span className="sm:hidden">On</span>
                </button>
              </WalletModal>
            ) : (
              <button 
                className="px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-mono tracking-wide transition-all duration-300 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-white"
                onClick={open}
                data-testid="button-connect-wallet"
              >
                <span className="hidden sm:inline">Connect</span>
                <span className="sm:hidden">Connect</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      <FeedbackModal open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
    </header>
  );
}