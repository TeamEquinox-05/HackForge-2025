import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

interface Vendor {
  _id: string;
  vendor_name: string;
  phone: string;
  email: string;
  address: string;
  gst_number: string;
  payment_terms: string;
}

interface Purchase {
  _id: string;
  bill_no: string;
  purchase_date: string;
  total_amount: number;
  payment_status: string;
  createdAt: string;
  vendor_id: {
    _id: string;
    vendor_name: string;
  };
}

const VendorDetails = () => {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch vendor details
  const fetchVendorDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      const response = await fetch(`http://localhost:5000/api/vendors/${vendorId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setVendor(data);
      } else {
        setError('Vendor not found');
      }
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      setError('Failed to load vendor details');
    }
  };

  // Fetch purchases for this vendor
  const fetchVendorPurchases = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      const response = await fetch(`http://localhost:5000/api/purchases`, { headers });
      if (response.ok) {
        const allPurchases = await response.json();
        // Filter purchases by vendor ID
        const vendorPurchases = allPurchases.filter((purchase: Purchase) => 
          purchase.vendor_id._id === vendorId
        );
        setPurchases(vendorPurchases);
      }
    } catch (error) {
      console.error('Error fetching vendor purchases:', error);
      setError('Failed to load vendor purchases');
    }
  };

  useEffect(() => {
    if (vendorId) {
      setLoading(true);
      Promise.all([fetchVendorDetails(), fetchVendorPurchases()])
        .finally(() => setLoading(false));
    }
  }, [vendorId]);

  // Calculate total stats
  const totalAmount = purchases.reduce((sum, purchase) => sum + purchase.total_amount, 0);
  const paidAmount = purchases
    .filter(purchase => purchase.payment_status === 'Paid')
    .reduce((sum, purchase) => sum + purchase.total_amount, 0);
  const pendingAmount = totalAmount - paidAmount;

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading vendor details...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !vendor) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 mb-4">{error || 'Vendor not found'}</div>
            <Button onClick={() => navigate('/vendors')}>
              Back to Vendors
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/vendors')}
                className="flex items-center space-x-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Vendors</span>
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">{vendor.vendor_name}</h1>
            </div>
          </div>
        </div>

        {/* Vendor Info Card */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-lg text-gray-900">{vendor.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg text-gray-900">{vendor.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Payment Terms</label>
                  <p className="text-lg text-gray-900">{vendor.payment_terms}</p>
                </div>
                {vendor.address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Address</label>
                    <p className="text-lg text-gray-900">{vendor.address}</p>
                  </div>
                )}
                {vendor.gst_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">GST Number</label>
                    <p className="text-lg text-gray-900">{vendor.gst_number}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Purchase Statistics */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{purchases.length}</div>
                  <div className="text-sm text-gray-500">Total Orders</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">₹{totalAmount.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Total Amount</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">₹{paidAmount.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Paid Amount</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">₹{pendingAmount.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Pending Amount</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Purchase History */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase History</CardTitle>
          </CardHeader>
          <CardContent>
            {purchases.length > 0 ? (
              <div className="space-y-4">
                {purchases
                  .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())
                  .map((purchase) => (
                    <div
                      key={purchase._id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/purchases/${purchase._id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h3 className="font-medium text-gray-900">#{purchase.bill_no}</h3>
                            <p className="text-sm text-gray-500">{formatDate(purchase.purchase_date)}</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-lg font-semibold text-gray-900">
                              ₹{purchase.total_amount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(purchase.payment_status)}`}>
                              {purchase.payment_status}
                            </span>
                          </div>
                          <div>
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">📦</div>
                <p>No purchases found for this vendor.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default VendorDetails;