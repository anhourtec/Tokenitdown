"use client"

import { EyeIcon, EyeOffIcon } from "lucide-react"
import * as React from "react"

import { Input } from "./input"
import { cn } from "../../lib/utils"

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Classes for the wrapping element (e.g. spacing). */
  wrapperClassName?: string
}

/** Password field with a show/hide eye toggle. */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, wrapperClassName, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)

    return (
      <div className={cn("relative", wrapperClassName)}>
        <Input ref={ref} type={visible ? "text" : "password"} className={cn("pr-10", className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          tabIndex={-1}
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-3 outline-none"
        >
          {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
