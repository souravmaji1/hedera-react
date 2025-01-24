// src/config/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Asegúrate de tener estas variables en tu archivo .env


// Crear el cliente de Supabase y exportarlo como una exportación nombrada
export const supabase =  createClient(
    'https://tnijqmtoqpmgdhvltuhl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuaWpxbXRvcXBtZ2Rodmx0dWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjUwOTE3MzcsImV4cCI6MjA0MDY2NzczN30.3c2EqGn5n0jLmG4l2NO_ovN_aIAhaLDBa0EKdwdnhCg'
  );;
