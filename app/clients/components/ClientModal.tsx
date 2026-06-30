"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
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
import { Checkbox } from "@/components/ui/checkbox"

const clientSchema = z.object({
  excelClientName: z.string().min(1, "Excel Client Name is required"),
  displayName: z.string().min(1, "Display Name is required"),
  companyName: z.string().min(1, "Company Name is required"),
  accountManager: z.string().optional(),
  sendReport: z.boolean(),
  isActive: z.boolean(),
  
  deliveryChannels: z.array(z.string()).min(1, "Select at least one delivery channel"),
  
  toEmails: z.string().optional(),
  ccEmails: z.string().optional(),
  bccEmails: z.string().optional(),
  subject: z.string().optional(),
  bodyTemplate: z.string().optional(),

  waGroupName: z.string().optional().nullable(),
  waGroupId: z.string().optional().nullable(),
  waCaption: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.deliveryChannels.includes("email")) {
    if (!data.toEmails || data.toEmails.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toEmails"],
        message: "To address is required for Email delivery",
      });
    }
    if (!data.subject || data.subject.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subject"],
        message: "Subject is required for Email delivery",
      });
    }
  }
  
  if (data.deliveryChannels.includes("whatsapp")) {
    if (!data.waGroupName || data.waGroupName.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["waGroupName"],
        message: "Group Name is required for WhatsApp delivery",
      });
    }
  }
});

type ClientFormValues = z.infer<typeof clientSchema>

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (client: any, id?: string) => Promise<void>
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
    control,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      excelClientName: "",
      displayName: "",
      companyName: "",
      accountManager: "",
      sendReport: true,
      isActive: true,
      deliveryChannels: ["email"],
      toEmails: "",
      ccEmails: "",
      bccEmails: "",
      subject: "",
      bodyTemplate: "",
      waGroupName: "",
      waGroupId: "",
      waCaption: "",
    },
  })

  React.useEffect(() => {
    if (initialData) {
      reset({
        excelClientName: initialData.excelClientName,
        displayName: initialData.displayName,
        companyName: initialData.companyName,
        accountManager: initialData.accountManager || "",
        sendReport: initialData.sendReport,
        isActive: initialData.isActive,
        deliveryChannels: initialData.deliveryChannels ? initialData.deliveryChannels.split(",").map(s => s.trim()).filter(Boolean) : ["email"],
        toEmails: initialData.toEmails || "",
        ccEmails: initialData.ccEmails || "",
        bccEmails: initialData.bccEmails || "",
        subject: initialData.subject || "",
        bodyTemplate: initialData.bodyTemplate || "",
        waGroupName: initialData.waGroupName || "",
        waGroupId: initialData.waGroupId || "",
        waCaption: initialData.waCaption || "",
      })
    } else {
      reset({
        excelClientName: "",
        displayName: "",
        companyName: "",
        accountManager: "",
        sendReport: true,
        isActive: true,
        deliveryChannels: ["email"],
        toEmails: "",
        ccEmails: "",
        bccEmails: "",
        subject: "",
        bodyTemplate: "",
        waGroupName: "",
        waGroupId: "",
        waCaption: "",
      })
    }
  }, [initialData, reset, isOpen])

  const isActive = watch("isActive")
  const sendReport = watch("sendReport")
  const deliveryChannels = watch("deliveryChannels") || []

  const hasEmail = deliveryChannels.includes("email")
  const hasWhatsapp = deliveryChannels.includes("whatsapp")

  const onSubmit = async (data: ClientFormValues) => {
    // Transform arrays back to strings for API if needed, 
    // although our API takes the string directly for deliveryChannels
    const apiData = {
      ...data,
      deliveryChannels: data.deliveryChannels.join(",")
    }
    await onSave(apiData, initialData?.id)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Client" : "Add Client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          
          {/* General Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2 text-slate-800">General Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="excelClientName">Excel Client Name *</Label>
                <Input id="excelClientName" placeholder="Exact match from Excel" {...register("excelClientName")} />
                {errors.excelClientName && <p className="text-xs text-red-500">{errors.excelClientName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input id="displayName" placeholder="UI friendly name" {...register("displayName")} />
                {errors.displayName && <p className="text-xs text-red-500">{errors.displayName.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input id="companyName" placeholder="Legal or official company name" {...register("companyName")} />
                {errors.companyName && <p className="text-xs text-red-500">{errors.companyName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountManager">Account Manager</Label>
                <Input id="accountManager" placeholder="Optional" {...register("accountManager")} />
              </div>
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
          </div>

          {/* Delivery Channels */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2 text-slate-800">Delivery Channels</h3>
            {errors.deliveryChannels && <p className="text-xs text-red-500">{errors.deliveryChannels.message}</p>}
            
            <div className="flex gap-6">
              <Controller
                name="deliveryChannels"
                control={control}
                render={({ field }) => (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="channel-email" 
                        checked={field.value.includes("email")}
                        onCheckedChange={(checked) => {
                          const current = field.value || []
                          const updated = checked 
                            ? [...current, "email"]
                            : current.filter(c => c !== "email")
                          field.onChange(updated)
                        }}
                      />
                      <Label htmlFor="channel-email" className="font-medium">Email</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="channel-whatsapp" 
                        checked={field.value.includes("whatsapp")}
                        onCheckedChange={(checked) => {
                          const current = field.value || []
                          const updated = checked 
                            ? [...current, "whatsapp"]
                            : current.filter(c => c !== "whatsapp")
                          field.onChange(updated)
                        }}
                      />
                      <Label htmlFor="channel-whatsapp" className="font-medium text-emerald-700">WhatsApp</Label>
                    </div>
                  </>
                )}
              />
            </div>
          </div>

          {/* Email Settings */}
          {hasEmail && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <h3 className="text-sm font-semibold border-b pb-2 text-slate-800">Email Settings</h3>
              
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
            </div>
          )}

          {/* WhatsApp Settings */}
          {hasWhatsapp && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <h3 className="text-sm font-semibold border-b pb-2 text-emerald-800">WhatsApp Settings</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="waGroupName">Group Name *</Label>
                  <Input id="waGroupName" placeholder="e.g. Sanmati Dispatch" {...register("waGroupName")} />
                  {errors.waGroupName && <p className="text-xs text-red-500">{errors.waGroupName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waGroupId">Group ID (Optional)</Label>
                  <Input id="waGroupId" placeholder="OpenClaw Group ID" {...register("waGroupId")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waCaption">Caption Template</Label>
                <Textarea 
                  id="waCaption" 
                  placeholder="Attached is the daily report..." 
                  {...register("waCaption")} 
                  className="resize-none h-20"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t">
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
