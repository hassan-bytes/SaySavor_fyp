import React, { useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { toast } from 'sonner';

export function BecomePartnerButton({ userId, userRoles, refreshUserRoles }: {
  userId: string;
  userRoles: string[]; // e.g. ['customer']
  refreshUserRoles: () => void; // Call this after upgrade to refresh roles in context
}) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Only show if not already a partner
  if (userRoles.includes('partner')) return null;

  const handleBecomePartner = async () => {
    setLoading(true);
    try {
      // 1. Get partner role_id
      const { data: roles, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'partner')
        .single();
      if (roleError || !roles) throw new Error('Could not find partner role');

      // 2. Insert into user_roles
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role_id: roles.id }]);
      if (insertError) throw insertError;

      toast.success('You are now a partner!');
      setShowConfirm(false);
      refreshUserRoles();
    } catch (err: any) {
      toast.error(err.message || 'Could not upgrade role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="btn btn-primary"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
      >
        Become a Partner
      </button>
      {showConfirm && (
        <div className="modal">
          <div className="modal-content">
            <h3>Become a Partner?</h3>
            <p>
              Are you sure you want to become a partner? This will allow you to manage a restaurant and your information will be visible to customers.
            </p>
            <button onClick={handleBecomePartner} disabled={loading}>
              {loading ? 'Processing...' : 'Yes, Confirm'}
            </button>
            <button onClick={() => setShowConfirm(false)} disabled={loading}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
