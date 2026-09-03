"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Marca } from "@/components/marca";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Navegacao } from "./navegacao";

export function MenuMobile() {
  const [aberto, setAberto] = useState(false);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Abrir menu de navegação"
          className="lg:hidden"
        >
          <Menu className="size-5" strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[17rem] bg-card p-0">
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-left">
            <Marca />
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navegue entre as seções do Meal Planner
          </SheetDescription>
        </SheetHeader>

        <div className="px-3 pb-5">
          <Navegacao aoNavegar={() => setAberto(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
