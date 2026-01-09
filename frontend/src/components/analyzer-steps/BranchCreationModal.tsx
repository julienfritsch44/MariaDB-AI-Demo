import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GitBranch, Loader2 } from "lucide-react"

interface BranchCreationModalProps {
    isOpen: boolean
    isCreating: boolean
    branchName: string
    rewrittenSql?: string
    onClose: () => void
    onCreate: () => void
}

export function BranchCreationModal({
    isOpen,
    isCreating,
    branchName,
    rewrittenSql,
    onClose,
    onCreate
}: BranchCreationModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-primary" />
                        Create Validation Branch
                    </DialogTitle>
                    <DialogDescription>
                        Create an isolated copy of Production to safely validate the fix.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-sm font-medium">Branch Name</label>
                        <Input value={branchName} disabled className="col-span-3 font-mono text-xs" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-sm font-medium">Source</label>
                        <Input value="Production (shop_demo)" disabled className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <label className="text-right mt-2 text-sm font-medium">Auto-Apply</label>
                        <div className="col-span-3 p-2 rounded-md bg-muted/50 border border-border/50 text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                            {rewrittenSql || "CREATE INDEX idx_customer_id ON orders(customer_id)"}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={onCreate} disabled={isCreating} className="gap-2">
                        {isCreating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Creating Branch...
                            </>
                        ) : (
                            <>
                                <GitBranch className="w-4 h-4" />
                                Confirm & Create
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
