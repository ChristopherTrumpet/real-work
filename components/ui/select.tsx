"use client"

import * as React from "react"
import { Select as SelectNamespace } from "radix-ui"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectNamespace.Root

const SelectGroup = SelectNamespace.Group

const SelectValue = SelectNamespace.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectNamespace.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectNamespace.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectNamespace.Trigger
    ref={ref}
    className={cn(
      "flex h-12 w-full items-center justify-between rounded-lg border border-input bg-muted/10 px-4 py-2 text-base font-medium ring-offset-background transition-all placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectNamespace.Icon asChild>
      <ChevronDown className="size-4 opacity-50" />
    </SelectNamespace.Icon>
  </SelectNamespace.Trigger>
))
SelectTrigger.displayName = SelectNamespace.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectNamespace.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectNamespace.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectNamespace.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="size-4" />
  </SelectNamespace.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectNamespace.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectNamespace.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectNamespace.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectNamespace.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="size-4" />
  </SelectNamespace.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectNamespace.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectNamespace.Content>,
  React.ComponentPropsWithoutRef<typeof SelectNamespace.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectNamespace.Portal>
    <SelectNamespace.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectNamespace.Viewport
        className={cn(
          "p-1.5",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectNamespace.Viewport>
      <SelectScrollDownButton />
    </SelectNamespace.Content>
  </SelectNamespace.Portal>
))
SelectContent.displayName = SelectNamespace.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectNamespace.Label>,
  React.ComponentPropsWithoutRef<typeof SelectNamespace.Label>
>(({ className, ...props }, ref) => (
  <SelectNamespace.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectNamespace.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectNamespace.Item>,
  React.ComponentPropsWithoutRef<typeof SelectNamespace.Item>
>(({ className, children, ...props }, ref) => (
  <SelectNamespace.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-lg py-2.5 pl-8 pr-2 text-sm font-medium outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      <SelectNamespace.ItemIndicator>
        <Check className="size-4 text-primary" />
      </SelectNamespace.ItemIndicator>
    </span>

    <SelectNamespace.ItemText>{children}</SelectNamespace.ItemText>
  </SelectNamespace.Item>
))
SelectItem.displayName = SelectNamespace.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectNamespace.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectNamespace.Separator>
>(({ className, ...props }, ref) => (
  <SelectNamespace.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectNamespace.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
