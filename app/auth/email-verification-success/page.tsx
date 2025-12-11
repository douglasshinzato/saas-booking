import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                E-mail verificado com sucesso!
              </CardTitle>
              <CardDescription>
                Obrigado! Sua conta está pronta para uso.
              </CardDescription>
            </CardHeader>
            <CardContent className="inline-flex">
              <div className="text-sm text-muted-foreground">
                <Link href="/auth/login" className="text-sm text-white underline underline-offset-4">Clique aqui</Link>
                {" "} para voltar ao login e acessar sua conta.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
