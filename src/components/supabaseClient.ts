
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xschelrukijcxvtuooqj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzY2hlbHJ1a2lqY3h2dHVvb3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDgwOTUsImV4cCI6MjA3MjMyNDA5NX0.B1r1QsVRTEQKypMArVOiU8tp4GvySMm8FzRDKOHVLqA'
export const supabase = createClient(supabaseUrl, supabaseKey)  