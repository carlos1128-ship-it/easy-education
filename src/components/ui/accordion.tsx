"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type AccordionContextValue = {
  openValue: string | null;
  toggle: (value: string) => void;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<string | null>(null);

type AccordionProps = React.ComponentProps<"div"> & {
  type?: "single";
  collapsible?: boolean;
};

function Accordion({ className, collapsible = false, children, ...props }: AccordionProps) {
  const [openValue, setOpenValue] = React.useState<string | null>(null);

  const value = React.useMemo<AccordionContextValue>(
    () => ({
      openValue,
      toggle: (itemValue) => {
        setOpenValue((current) => {
          if (current === itemValue) return collapsible ? null : current;
          return itemValue;
        });
      },
    }),
    [collapsible, openValue],
  );

  return (
    <AccordionContext.Provider value={value}>
      <div className={cn(className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

type AccordionItemProps = React.ComponentProps<"div"> & {
  value: string;
};

function AccordionItem({ className, value, children, ...props }: AccordionItemProps) {
  const context = React.useContext(AccordionContext);
  const isOpen = context?.openValue === value;

  return (
    <AccordionItemContext.Provider value={value}>
      <div data-state={isOpen ? "open" : "closed"} className={cn(className)} {...props}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

function AccordionTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  const context = React.useContext(AccordionContext);
  const itemValue = React.useContext(AccordionItemContext);
  const isOpen = itemValue ? context?.openValue === itemValue : false;

  return (
    <button
      type="button"
      data-state={isOpen ? "open" : "closed"}
      className={cn(
        "flex w-full items-center justify-between gap-4 text-left transition-all [&>svg]:shrink-0 [&>svg]:transition-transform data-[state=open]:[&>svg]:rotate-180",
        className,
      )}
      onClick={() => {
        if (itemValue) context?.toggle(itemValue);
      }}
      {...props}
    >
      {children}
      <ChevronDown className="size-4" />
    </button>
  );
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<"div">) {
  const context = React.useContext(AccordionContext);
  const itemValue = React.useContext(AccordionItemContext);
  const isOpen = itemValue ? context?.openValue === itemValue : false;

  if (!isOpen) return null;

  return (
    <div data-state="open" className={cn("pb-6", className)} {...props}>
      {children}
    </div>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
