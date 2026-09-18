SELECT 'CREATE DATABASE booking_tour_test'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'booking_tour_test'
)\gexec
