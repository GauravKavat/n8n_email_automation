"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Client } from "@/types/client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

const clientSchema = z.object({
  excelClientName: z.string().min(1, "Excel Client Name is required"),
  displayName: z.string().min(1, "Display Name is required"),
  companyName: z.string().min(1, "Company Name is required"),
  toEmails: z.string().min(1, "To address is required"),
  ccEmails: z.string().optional(),
  bccEmails: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  bodyTemplate: z.string().optional(),
  sendReport: z.boolean(),
  isActive: z.boolean(),
})

type ClientFormValues = z.infer<typeof clientSchema>

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (client: ClientFormValues, id?: string) => Promise<void>
  initialData?: Client | null
  isSaving: boolean
}

export function ClientModal({ isOpen, onClose, onSave, initialData, isSaving }: ClientModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      excelClientName: "",
      displayName: "",
      companyName: "",
      toEmails: "",
      ccEmails: "",
      bccEmails: "",
      subject: "",
      bodyTemplate: "",
      sendReport: true,
      isActive: true,
    },
  })

  React.useEffect(() => {
    if (initialData) {
      reset({
        excelClientName: initialData.excelClientName,
        displayName: initialData.displayName,
        companyName: initialData.companyName,
        toEmails: initialData.toEmails,
        ccEmails: initialData.ccEmails,
        bccEmails: initialData.bccEmails,
        subject: initialData.subject,
        bodyTemplate: initialData.bodyTemplate,
        sendReport: initialData.sendReport,
        isActive: initialData.isActive,
      })
    } else {
      reset({
        excelClientName: "",
        displayName: "",
        companyName: "",
        toEmails: "",
        ccEmails: "",
        bccEmails: "",
        subject: "",
        bodyTemplate: "",
        sendReport: true,
        isActive: true,
      })
    }
  }, [initialData, reset, isOpen])

  const isActive = watch("isActive")
  const sendReport = watch("sendReport")

  const onSubmit = async (data: ClientFormValues) => {
    await onSave(data, initialData?.id)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Client" : "Add Client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="excelClientName">Excel Client Name *</Label>
              <Input id="excelClientName" placeholder="Exact match from Excel" {...register("excelClientName")} />
              <p className="text-[10px] text-slate-500">Must exactly match the 'Client orgnization' column in Excel.</p>
              {errors.excelClientName && <p className="text-xs text-red-500">{errors.excelClientName.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name *</Label>
              <Input id="displayName" placeholder="UI friendly name" {...register("displayName")} />
              <p className="text-[10px] text-slate-500">Used for readability in this dashboard.</p>
              {errors.displayName && <p className="text-xs text-red-500">{errors.displayName.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input id="companyName" placeholder="Legal or official company name" {...register("companyName")} />
            {errors.companyName && <p className="text-xs text-red-500">{errors.companyName.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="toEmails">To *</Label>
              <Textarea id="toEmails" placeholder="one@email.com&#10;two@email.com" {...register("toEmails")} className="resize-none h-24 text-sm" />
              <p className="text-[10px] text-slate-500">One email per line.</p>
              {errors.toEmails && <p className="text-xs text-red-500">{errors.toEmails.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ccEmails">CC</Label>
              <Textarea id="ccEmails" placeholder="ops@email.com" {...register("ccEmails")} className="resize-none h-24 text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bccEmails">BCC</Label>
              <Textarea id="bccEmails" placeholder="bcc@email.com" {...register("bccEmails")} className="resize-none h-24 text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input id="subject" placeholder="Daily Report" {...register("subject")} />
            {errors.subject && <p className="text-xs text-red-500">{errors.subject.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bodyTemplate">Email Body Template</Label>
            <Textarea 
              id="bodyTemplate" 
              placeholder="Please find attached..." 
              {...register("bodyTemplate")} 
              className="resize-none h-24"
            />
          </div>

          <div className="flex flex-col space-y-4 pt-2">
            <div className="flex items-center space-x-2">
              <Switch 
                id="active" 
                checked={isActive} 
                onCheckedChange={(checked) => setValue("isActive", checked)} 
              />
              <Label htmlFor="active">Active (Visible in system)</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="sendReport" 
                checked={sendReport} 
                onCheckedChange={(checked) => setValue("sendReport", checked)} 
              />
              <Label htmlFor="sendReport">Auto Send (Include in automated sending)</Label>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
