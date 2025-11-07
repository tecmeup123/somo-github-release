import { ccc } from "@ckb-ccc/connector-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Wallet } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const signer = ccc.useSigner();
  const { open } = ccc.useCcc();

  if (!signer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black flex items-center justify-center px-4">
        <Card className="max-w-md w-full bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#DBAB00]/20 border-2 border-[#DBAB00] flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-[#DBAB00]" />
            </div>
            <CardTitle className="text-2xl">Wallet Connection Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-gray-400">
              You need to connect your wallet to access this page.
            </p>
            <Button
              size="lg"
              onClick={() => open()}
              className="w-full bg-gradient-to-r from-[#DBAB00] to-[#FFBDFC] hover:opacity-90 text-black font-bold"
              data-testid="button-connect-wallet-protected"
            >
              <Wallet className="mr-2 h-5 w-5" />
              Connect Wallet
            </Button>
            <p className="text-sm text-gray-500">
              Supported wallets: JoyID, MetaMask, UTXOGlobal
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
