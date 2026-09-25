pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                nodejs('Node-18') { 
                    sh 'npm ci'
                }
                sh 'docker build -t student-accommodation-system .'
            }
        }

        stage('Test') {
            steps {
                echo 'TODO: npm test (Jest + Supertest + mongodb-memory-server), publish coverage/junit reports'
            }
        }

        stage('Code Quality') {
            steps {
                echo 'TODO: eslint + SonarQube/SonarCloud scan'
            }
        }

        stage('Security') {
            steps {
                echo 'TODO: npm audit / Snyk / Trivy scan of image and dependencies'
            }
        }

        stage('Deploy') {
            steps {
                echo 'TODO: docker-compose up (app + mongo) to a test environment'
            }
        }

        stage('Release') {
            steps {
                echo 'TODO: tag image, promote to production registry/environment'
            }
        }

        stage('Monitoring') {
            steps {
                echo 'TODO: verify /health and /metrics, register with Prometheus/Datadog, alert rules'
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
        }
        failure {
            echo 'Pipeline failed — check stage logs above.'
        }
    }
}
